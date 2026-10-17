import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
} from '@nestjs/common';
import { CurrentUser, Public, Roles } from './auth.decorators';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { AuthenticatedUser } from '../domain/types';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** POST /api/auth/login — email + password → bearer token. */
  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginDto) {
    return this.auth.login(body);
  }

  /** POST /api/auth/register — creates a tenant and its first ADMIN. */
  @Public()
  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.auth.register(body);
  }

  /** GET /api/auth/me — current user + tenant. */
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.id);
  }

  /** GET /api/auth/users — tenant members (ADMIN only). */
  @Get('users')
  @Roles('ADMIN')
  users(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.listUsers(user.tenantId);
  }
}
