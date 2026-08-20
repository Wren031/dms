import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { Public } from '../../common/decorators/public.decorator';
import { PublicAuth } from './decorators/auth.decorator';
import { AuthService, RequestContext } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { CookieService, REFRESH_COOKIE_NAME } from './services/cookie.service';

type RefreshRequestUser = JwtPayload & { rawToken: string };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
  ) {}

  private getContext(request: Request): RequestContext {
    return {
      ip: request.ip ?? null,
      userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
    };
  }

  private setRefreshCookie(response: Response, token: string): void {
    this.cookieService.setRefreshCookie(response, token);
  }

  private clearRefreshCookie(response: Response): void {
    this.cookieService.clearRefreshCookie(response);
  }

  // ------------------------------------------------------------------
  // Public endpoints
  // ------------------------------------------------------------------

  @PublicAuth()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() request: Request) {
    const result = await this.authService.register(dto, this.getContext(request));
    return { success: true, ...result };
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() _dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = request.user as AuthenticatedUser;
    const result = await this.authService.login(user, this.getContext(request));
    this.setRefreshCookie(response, result.refreshToken);
    return { success: true, user: result.user, accessToken: result.accessToken };
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Body() _dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const payload = request.user as RefreshRequestUser;
    const result = await this.authService.refresh(payload, this.getContext(request));
    this.setRefreshCookie(response, result.refreshToken);
    return { success: true, user: result.user, accessToken: result.accessToken };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto, @Req() request: Request) {
    await this.authService.verifyEmail(dto.token, this.getContext(request));
    return { success: true, message: 'Email verified successfully' };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('resend-verification')
  async resendVerification(@Body() dto: ResendVerificationDto, @Req() request: Request) {
    const verificationToken = await this.authService.resendVerification(
      dto.email,
      this.getContext(request),
    );
    return {
      success: true,
      message: 'If an account exists, a verification email has been sent',
      verificationToken,
    };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() request: Request) {
    const result = await this.authService.forgotPassword(dto.email, this.getContext(request));
    return { success: true, ...result };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() request: Request) {
    const result = await this.authService.resetPassword(dto, this.getContext(request));
    return { success: true, ...result };
  }

  // ------------------------------------------------------------------
  // Authenticated endpoints
  // ------------------------------------------------------------------

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const rawToken = request.cookies?.[REFRESH_COOKIE_NAME] ?? null;
    await this.authService.logout(user, rawToken, this.getContext(request));
    this.clearRefreshCookie(response);
    return { success: true, message: 'Logged out' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logoutAll(user, this.getContext(request));
    this.clearRefreshCookie(response);
    return { success: true, message: 'All sessions revoked' };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Req() request: Request,
  ) {
    const result = await this.authService.changePassword(user.id, dto, this.getContext(request));
    return { success: true, ...result };
  }

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.authService.getProfile(user.id);
    return { success: true, user: profile };
  }
}
