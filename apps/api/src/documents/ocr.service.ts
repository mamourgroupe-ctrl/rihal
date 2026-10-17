import { Injectable, Logger } from '@nestjs/common';
import { Gender, PassportOcrResult } from '../domain/types';

/**
 * Pluggable OCR transport.
 *
 * The default adapter is a no-op because real OCR (Tesseract/cloud vision)
 * needs runtime binaries or network access we do not assume here. Operators
 * can therefore paste or scan the passport MRZ, which we parse and validate
 * deterministically — no guesswork, no fake "AI confidence".
 *
 * Swap `NoopOcrAdapter` for a real adapter (Tesseract, AWS Textract, Google
 * Vision) implementing this interface to extract the MRZ directly from the
 * uploaded image; the rest of the pipeline stays unchanged.
 */
export interface OcrAdapter {
  readonly name: string;
  /** Returns the MRZ text found in the file, or null. */
  recognize(buffer: Buffer, mimeType: string): Promise<string | null>;
}

@Injectable()
export class NoopOcrAdapter implements OcrAdapter {
  readonly name = 'manual-mrz';
  async recognize(_buffer: Buffer, _mimeType: string): Promise<null> {
    return null;
  }
}

const MRZ_LINE_LENGTH = 44;

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(private readonly adapter: NoopOcrAdapter) {}

  get adapterName(): string {
    return this.adapter.name;
  }

  /**
   * Extracts passport fields from a TD3 (passport) machine readable zone.
   * Returns null when the text does not contain two MRZ lines.
   */
  parsePassportMrz(raw?: string | null): PassportOcrResult | null {
    if (!raw) return null;

    const lines = raw
      .toUpperCase()
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, '').trim())
      .filter((line) => line.length >= 30)
      .map((line) => line.padEnd(MRZ_LINE_LENGTH, '<').slice(0, MRZ_LINE_LENGTH));

    // Find the first line that looks like a TD3 header followed by a data line.
    let headerIndex = lines.findIndex(
      (line, index) =>
        line.startsWith('P') &&
        line.includes('<') &&
        index + 1 < lines.length &&
        /^[A-Z0-9<]{9}\d/.test(lines[index + 1]),
    );
    if (headerIndex === -1 && lines.length >= 2) headerIndex = 0;
    if (headerIndex === -1 || headerIndex + 1 >= lines.length) return null;

    const line1 = lines[headerIndex];
    const line2 = lines[headerIndex + 1];

    const passportNumber = line2.slice(0, 9).replace(/</g, '');
    const passportCheck = line2[9];
    const nationality = line2.slice(10, 13).replace(/</g, '');
    const dobRaw = line2.slice(13, 19);
    const dobCheck = line2[19];
    const sex = line2[20];
    const expiryRaw = line2.slice(21, 27);
    const expiryCheck = line2[27];
    const personalNumber = line2.slice(28, 42).replace(/</g, '');
    const personalCheck = line2[42];
    const compositeCheck = line2[43];

    const checkDigitsValid =
      this.checkDigit(passportNumber) === passportCheck &&
      this.checkDigit(dobRaw) === dobCheck &&
      this.checkDigit(expiryRaw) === expiryCheck &&
      this.checkDigit(personalNumber) === personalCheck &&
      this.checkDigit(
        line2.slice(0, 10) + line2.slice(13, 20) + line2.slice(21, 43),
      ) === compositeCheck;

    if (!passportNumber || !/^\d{6}$/.test(dobRaw) || !/^\d{6}$/.test(expiryRaw)) {
      return null;
    }

    const [surnamePart, givenPart] = line1
      .slice(5)
      .split('<<')
      .map((part) => part.replace(/</g, ' ').replace(/\s+/g, ' ').trim());

    const gender: Gender | undefined =
      sex === 'M' ? 'MALE' : sex === 'F' ? 'FEMALE' : undefined;

    if (!checkDigitsValid) {
      this.logger.warn(
        `MRZ check digits failed for passport ${passportNumber} — document stays unverified`,
      );
    }

    return {
      source: 'mrz',
      passportNumber,
      fullNameEn: [givenPart, surnamePart].filter(Boolean).join(' ') || undefined,
      nationality,
      dateOfBirth: this.mrzDate(dobRaw, 'birth'),
      passportExpiry: this.mrzDate(expiryRaw, 'expiry'),
      gender,
      issuingState: line1.slice(2, 5).replace(/</g, ''),
      checkDigitsValid,
      mismatches: [],
    };
  }

  /** Supports the adapter pipeline once a real OCR engine is wired in. */
  async recognize(buffer: Buffer, mimeType: string): Promise<string | null> {
    return this.adapter.recognize(buffer, mimeType);
  }

  /** ICAO 9303 check digit: weights 7-3-1, A=10 … Z=35, '<'=0. */
  checkDigit(value: string): string {
    const weights = [7, 3, 1];
    let total = 0;
    for (let index = 0; index < value.length; index += 1) {
      const character = value[index];
      let numeric = 0;
      if (character >= '0' && character <= '9') {
        numeric = Number(character);
      } else if (character >= 'A' && character <= 'Z') {
        numeric = character.charCodeAt(0) - 55;
      }
      total += numeric * weights[index % 3];
    }
    return String(total % 10);
  }

  private mrzDate(raw: string, kind: 'birth' | 'expiry'): string | undefined {
    const year = Number(raw.slice(0, 2));
    const month = Number(raw.slice(2, 4));
    const day = Number(raw.slice(4, 6));
    if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;

    const currentYear = new Date().getUTCFullYear();
    let fullYear: number;
    if (kind === 'expiry') {
      fullYear = 2000 + year;
    } else {
      // A living pilgrim cannot be born in the future.
      fullYear = 2000 + year > currentYear ? 1900 + year : 2000 + year;
    }

    const date = new Date(Date.UTC(fullYear, month - 1, day));
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString().slice(0, 10);
  }
}
