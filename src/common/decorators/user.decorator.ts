import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserData {
  id: number;
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
  (
    data: keyof CurrentUserData | undefined,
    ctx: ExecutionContext,
  ): CurrentUserData | any => {
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
    return request.user?.id;
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
