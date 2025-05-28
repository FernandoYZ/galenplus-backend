import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser, CurrentUserData } from '../common';
import { cookieConfig, serverConfig } from '../config/env';
import { AuthenticatedRequest } from './interfaces/auth.interface';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const result = await this.authService.login(loginDto);

      // Configurar cookies seguras con configuración específica para desarrollo
      const isProduction = serverConfig.nodeEnv === 'production';
      
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction, // Solo secure en producción
        sameSite: 'lax' as const, // Cambiar a 'lax' para desarrollo local
        // domain: isProduction ? cookieConfig.domain : undefined, // Sin domain en desarrollo
        path: '/',
      };

      // Access token con vida corta
      response.cookie('access_token', result.accessToken, {
        ...cookieOptions,
        maxAge: 4 * 60 * 60 * 1000, // 4 horas
      });

      // Refresh token con vida larga  
      response.cookie('refresh_token', result.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      });

      return {
        success: true,
        message: 'Login exitoso',
        user: {
          id: result.user.id,
          nombre: result.user.nombre,
          apellido: result.user.apellido,
          isMedico: result.user.isMedico,
          roles: result.user.rolesNombre,
        },
        debug: {
          tokenSize: result.tokenSize,
          maxRecommended: 4096,
        },
      };
    } catch (error) {
      this.logger.error('Error en login:', error);
      throw error;
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: CurrentUserData,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(user.id);

    const isProduction = serverConfig.nodeEnv === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
    };

    response.clearCookie('access_token', cookieOptions);
    response.clearCookie('refresh_token', cookieOptions);

    return {
      success: true,
      message: 'Logout exitoso',
    };
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const user = request.user;
      
      // Generar nuevo access token
      const newAccessToken = this.authService.generateAccessToken({
        sub: user.sub,
        idMedico: user.idMedico,
        isMedico: user.isMedico,
        roles: user.roles,
      });

      const isProduction = serverConfig.nodeEnv === 'production';
      
      response.cookie('access_token', newAccessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 4 * 60 * 60 * 1000, // 4 horas
      });

      return {
        success: true,
        message: 'Token renovado exitosamente',
      };
    } catch (error) {
      this.logger.error('Error al renovar token:', error);
      throw error;
    }
  }

  @Get('usuario')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: CurrentUserData) {
    return {
      success: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        isMedico: user.isMedico,
        roles: user.rolesNombre,
        especialidades: user.especialidades,
      },
    };
  }

  @Get('verificar')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyToken(@CurrentUser() user: CurrentUserData) {
    return {
      valid: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        isMedico: user.isMedico,
        roles: user.rolesNombre,
      },
    };
  }

  // DEBUG: Endpoint para ver cookies recibidas
  @Public()
  @Get('debug/cookies')
  async debugCookies(@Req() request: Request) {
    return {
      cookies: request.cookies,
      headers: {
        cookie: request.headers.cookie,
        userAgent: request.headers['user-agent'],
      },
    };
  }
}