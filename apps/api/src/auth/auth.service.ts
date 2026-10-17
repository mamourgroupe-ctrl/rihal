import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { DataService } from '../domain/data.service';
import {
  AuthenticatedUser,
  Role,
  SafeUser,
  Tenant,
  User,
} from '../domain/types';
import { LoginDto, RegisterDto } from './dto';

const BCRYPT_ROUNDS = 10;

export interface AuthSession {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: SafeUser;
  tenant: Tenant;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly data: DataService,
    private readonly jwt: JwtService,
  ) {}

  async login(input: LoginDto): Promise<AuthSession> {
    const candidates = await this.data.findUsersByEmail(input.email);

    const matches: Array<{ user: User; tenant: Tenant }> = [];
    for (const user of candidates) {
      if (await compare(input.password, user.passwordHash)) {
        const tenant = await this.data.findTenantById(user.tenantId);
        if (tenant) matches.push({ user, tenant });
      }
    }

    if (matches.length === 0) {
      throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    const filtered = input.tenantSlug
      ? matches.filter(
          ({ tenant }) =>
            tenant.slug.toLowerCase() === input.tenantSlug!.toLowerCase(),
        )
      : matches;

    if (filtered.length === 0) {
      throw new UnauthorizedException('الحساب غير موجود في هذه الوكالة');
    }
    if (filtered.length > 1) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'هذا البريد مرتبط بأكثر من وكالة — حدّد معرّف الوكالة',
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const { user, tenant } = filtered[0];
    if (tenant.status !== 'ACTIVE') {
      throw new ForbiddenException('اشتراك الوكالة غير نشط');
    }

    await this.data.touchLastLogin(user.id, new Date().toISOString());
    return this.buildSession(user, tenant);
  }

  async register(input: RegisterDto): Promise<AuthSession> {
    const existing = await this.data.findTenantBySlug(input.slug);
    if (existing) {
      throw new ConflictException('معرّف الوكالة (slug) مستخدم مسبقاً');
    }
    const sameEmail = await this.data.findUsersByEmail(input.email);
    if (sameEmail.length > 0) {
      throw new ConflictException('البريد الإلكتروني مسجّل مسبقاً');
    }

    const passwordHash = await hash(input.password, BCRYPT_ROUNDS);
    const { tenant, admin } = await this.data.createTenantWithAdmin(
      {
        agencyName: input.agencyName,
        slug: input.slug,
        name: input.name,
        email: input.email,
        password: input.password,
        phone: input.phone,
      },
      passwordHash,
    );

    return this.buildSession(admin, tenant);
  }

  async me(userId: string): Promise<{ user: SafeUser; tenant: Tenant }> {
    const identity = await this.data.findIdentity(userId);
    if (!identity) throw new UnauthorizedException('الحساب غير نشط');
    const user = await this.data.findUserById(identity.id);
    const tenant = await this.data.findTenantById(identity.tenantId);
    if (!user || !tenant) {
      throw new UnauthorizedException('الحساب غير موجود');
    }
    return { user: this.toSafeUser(user), tenant };
  }

  async listUsers(tenantId: string): Promise<SafeUser[]> {
    const users = await this.data.listUsers(tenantId);
    return users.map((user) => this.toSafeUser(user));
  }

  private buildSession(user: User, tenant: Tenant): AuthSession {
    const identity: AuthenticatedUser = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const accessToken = this.jwt.sign({
      sub: identity.id,
      tenantId: identity.tenantId,
      role: identity.role,
      email: identity.email,
      name: identity.name,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN || '12h',
      user: this.toSafeUser(user),
      tenant,
    };
  }

  private toSafeUser(user: User): SafeUser {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }
}

// Re-exported for callers that only need the role union.
export type { Role };
