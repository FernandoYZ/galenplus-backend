import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as sql from 'mssql';

export interface AuditParams {
  idEmpleado: number;
  accion: 'A' | 'M' | 'E' | 'C'; // Agregar, Modificar, Eliminar, Consultar
  idRegistro: number;
  tabla: string;
  idListItem?: number;
  nombrePC?: string;
  observaciones?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Registra una auditoría en la base de datos
   */
  async registrarAuditoria(params: AuditParams): Promise<void> {
    try {
      const pool = await this.databaseService.getMainConnection();
      
      await pool
        .request()
        .input('IdEmpleado', sql.Int, params.idEmpleado)
        .input('Accion', sql.Char(1), params.accion)
        .input('IdRegistro', sql.Int, params.idRegistro)
        .input('Tabla', sql.VarChar(50), params.tabla)
        .input('idListItem', sql.Int, params.idListItem || 0)
        .input('nombrePC', sql.VarChar(30), params.nombrePC || 'API')
        .input('observaciones', sql.VarChar(100), params.observaciones || '')
        .execute('AuditoriaAgregarV');

      this.logger.debug(`Auditoría registrada: ${params.accion} en ${params.tabla} por usuario ${params.idEmpleado}`);
    } catch (error) {
      this.logger.error('Error al registrar auditoría:', error);
      // No fallar la operación principal por un error de auditoría
    }
  }

  /**
   * Registra múltiples auditorías en lote
   */
  async registrarAuditoriaEnLote(auditorias: AuditParams[]): Promise<void> {
    const promises = auditorias.map(auditoria => this.registrarAuditoria(auditoria));
    await Promise.allSettled(promises);
  }

  /**
   * Obtener datos del empleado para auditoría
   */
  async obtenerDatosEmpleado(idUsuario: number): Promise<string> {
    try {
      const pool = await this.databaseService.getMainConnection();
      
      const result = await pool
        .request()
        .input('IdUsuario', sql.Int, idUsuario)
        .query(`
          SELECT 
            UPPER(LTRIM(RTRIM(Nombres+' '+ApellidoPaterno+ ' '+ISNULL(ApellidoMaterno,'')))) AS Usuario
          FROM Empleados 
          WHERE IdEmpleado = @IdUsuario
        `);

      return result.recordset[0]?.Usuario || 'API';
    } catch (error) {
      this.logger.error('Error al obtener datos del empleado:', error);
      return 'API';
    }
  }
}