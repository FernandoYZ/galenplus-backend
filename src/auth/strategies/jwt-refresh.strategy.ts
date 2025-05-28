import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { jwtConfig } from '../../config/env';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  private readonly logger = new Logger(JwtRefreshStrategy.name);

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          let token = null;
          
          if (request && request.cookies) {
            token = request.cookies['refresh_token'];
            
            if (!token) {
              this.logger.debug('No refresh_token found in cookies');
            } else {
              this.logger.debug('Refresh token found in cookie');
            }
          }
          
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.refreshSecret,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: any) {
    const refreshToken = req.cookies?.['refresh_token'];
    
    return { ...payload, refreshToken };
  }
}

// src/common/decorators/user.decorator.ts - ACTUALIZADA
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserData {
  id: number;
  sub: number; // Añadido para compatibilidad con JWT
  idMedico?: number;
  nombre: string;
  apellido: string;
  isMedico: boolean;
  roles: number[];
  rolesNombre: string[];
  permisos: number[];
  accionesItems: Array<{
    id: number;
    a: number; // agregar
    m: number; // modificar
    e: number; // eliminar
    c: number; // consultar
  }>;
  especialidades: number[];
  filtroEspecialidades?: number[];
  filtroEspecialidadesSQL?: string;
}

/**
 * Decorador para obtener el usuario actual desde el request
 */
export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserData | undefined, ctx: ExecutionContext): CurrentUserData | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);

/**
 * Decorador para obtener solo el ID del usuario
 */
export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.id || request.user?.sub;
  },
);

/**
 * Decorador para verificar si el usuario es médico
 */
export const IsMedico = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): boolean => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.isMedico || false;
  },
);

/**
 * Decorador para obtener los roles del usuario
 */
export const UserRoles = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number[] => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.roles || [];
  },
);