// src/common/utils/error.utils.ts
import { HttpException, HttpStatus } from '@nestjs/common';
import { obtenerFechaHoraLima } from './date.utils';

export class BusinessException extends HttpException {
  constructor(message: string, code?: string) {
    super(
      {
        message,
        code,
        timestamp: obtenerFechaHoraLima().toISOString(),
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class DatabaseException extends HttpException {
  constructor(message: string, originalError?: any) {
    super(
      {
        message: 'Error en base de datos',
        details: message,
        timestamp: obtenerFechaHoraLima().toISOString(),
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

/**
 * Maneja errores de SQL Server específicos
 */
export function handleSqlError(error: any): never {
  if (error.number === 2627) {
    throw new BusinessException(
      'Ya existe un registro con los mismos datos',
      'DUPLICATE_RECORD',
    );
  } else if (error.number === 547) {
    throw new BusinessException(
      'Error de integridad referencial',
      'REFERENTIAL_INTEGRITY',
    );
  } else if (error.number === 2) {
    throw new DatabaseException('No se pudo conectar a la base de datos');
  }

  throw new DatabaseException(error.message, error);
}