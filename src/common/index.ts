export * from './database/database.service';
export * from './services/audit.service';

// Facturación
export * from './facturacion';

// Decoradores
export * from './decorators/user.decorator';
export * from './decorators/roles.decorator';
export * from './decorators/permissions.decorator';
export * from './decorators/item-actions.decorator';

// Guards
export * from './guards/roles.guard';
export * from './guards/permissions.guard';
export * from './guards/item-actions.guard';
export * from './guards/especialidades.guard';

// Utilidades
export * from './utils/date.utils';
export * from './utils/validation.utils';
export * from './utils/error.utils';
export * from './utils/math.utils';

// Constantes del sistema
export const ROLES = {
  ADMIN: 1,
  SUPERVISOR: 79,
  INFORMATICA: 195,
  VER_PACIENTE: 94,
  TRIAJE: 101,
  MEDICO_CE: 149,
  PROGRAMAS: 154,
  RECEPCION: 52,
} as const;

export const ITEMS = {
  PACIENTE: 101,
  CITAS: 102,
  ATENCION_MEDICA: 103,
  TRIAJE: 1303,
} as const;

export const SERVICIOS_NO_TRIAJE = [149, 367, 312, 346, 347, 358] as const;
export const SERVICIOS_ESTRATEGIA = [145, 149, 230, 312, 346, 347, 358, 367, 407, 439] as const;

// Tipos comunes
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}