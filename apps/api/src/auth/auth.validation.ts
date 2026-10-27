import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((email) => email.toLowerCase());

const tenantSlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(63)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .transform((slug) => slug.toLowerCase());

const loginPasswordSchema = z
  .string()
  .min(1)
  .max(72)
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72);

const newPasswordSchema = z
  .string()
  .min(12)
  .max(72)
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72);

export const loginSchema = z
  .object({
    tenantSlug: tenantSlugSchema,
    email: emailSchema,
    password: loginPasswordSchema,
  })
  .strict();

export const requestPasswordResetSchema = z
  .object({
    tenantSlug: tenantSlugSchema,
    email: emailSchema,
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(128),
    newPassword: newPasswordSchema,
  })
  .strict();

export function parseAuthBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException('Invalid request body');
  }
  return result.data;
}
