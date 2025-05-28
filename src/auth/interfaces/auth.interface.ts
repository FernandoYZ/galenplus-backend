import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: UserPayload;
}

// OPTIMIZED: Payload más pequeño para el JWT
export interface JwtPayload {
  sub: number; // ID del usuario
  idMedico?: number | null;
  isMedico: boolean;
  roles: number[]; // Solo IDs, no nombres
}

// Datos completos del usuario (no van en el JWT)
export interface UserPayload extends JwtPayload {
  id: number;
  nombre: string;
  apellido: string;
  rolesNombre: string[];
  permisos: number[];
  accionesItems: Array<{
    id: number;
    a: number;
    m: number;
    e: number;
    c: number;
  }>;
  especialidades: number[];
  filtroEspecialidades?: number[] | null;
  filtroEspecialidadesSQL?: string;
}