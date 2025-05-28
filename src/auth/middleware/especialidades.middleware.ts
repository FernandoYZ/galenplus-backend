import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DatabaseService } from '../../common';
import { ROLES } from '../../common';
import * as sql from 'mssql';
import { AuthenticatedRequest } from '../interfaces/auth.interface';

@Injectable()
export class EspecialidadesMiddleware implements NestMiddleware {
  private readonly logger = new Logger(EspecialidadesMiddleware.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user;

      // Si no hay usuario autenticado, continuar
      if (!user) {
        return next();
      }

      // Inicializar filtro de especialidades
      user.filtroEspecialidades = [];
      user.filtroEspecialidadesSQL = '';

      // Roles con acceso total (sin filtros)
      if (user.roles && (
          user.roles.includes(ROLES.ADMIN) || 
          user.roles.includes(ROLES.SUPERVISOR) || 
          user.roles.includes(ROLES.INFORMATICA) || 
          user.roles.includes(ROLES.VER_PACIENTE) || 
          user.roles.includes(ROLES.RECEPCION) ||
          user.roles.includes(ROLES.MEDICO_CE))) {
        user.filtroEspecialidades = null;
        return next();
      }

      // Si es médico de programas (rol 154), filtrar por su especialidad y médico
      if (user.isMedico && user.roles && user.roles.includes(ROLES.PROGRAMAS)) {
        const pool = await this.databaseService.getMainConnection();
        
        const espResult = await pool
          .request()
          .input('IdMedico', sql.Int, user.idMedico)
          .query(`
            SELECT DISTINCT s.IdServicio
            FROM ProgramacionMedica pm
            INNER JOIN Servicios s ON pm.IdServicio = s.IdServicio
            WHERE pm.IdMedico = @IdMedico
            AND s.IdServicio IN (145, 149, 230, 312, 346, 347, 358, 367, 407, 439)
          `);
              
        if (espResult.recordset?.length > 0) {
          const especialidades = espResult.recordset.map(r => r.IdServicio);
          user.filtroEspecialidades = especialidades;
          
          // Only join if we have especialidades
          if (especialidades.length > 0) {
            user.filtroEspecialidadesSQL = ` AND s.IdServicio IN (${especialidades.join(',')})`;
            
            // Médicos de programas solo ven sus propias citas
            if (user.idMedico) {
              user.filtroEspecialidadesSQL += ` AND me.IdMedico = ${user.idMedico}`;
            }
          }
        }
      } else if (user.isMedico && user.idMedico) {
        // Para otros médicos, limitar a especialidades asociadas
        const pool = await this.databaseService.getMainConnection();
        const espResult = await pool
          .request()
          .input('IdMedico', sql.Int, user.idMedico)
          .query(`
            SELECT DISTINCT s.IdServicio
            FROM ProgramacionMedica pm
            INNER JOIN Servicios s ON pm.IdServicio = s.IdServicio
            WHERE pm.IdMedico = @IdMedico
            AND s.IdServicio IN (145, 149, 230, 312, 346, 347, 358, 367, 407, 439)
          `);
              
        if (espResult.recordset?.length > 0) {
          const especialidades = espResult.recordset.map(r => r.IdServicio);
          user.filtroEspecialidades = especialidades;
          
          // Only join if we have especialidades
          if (especialidades.length > 0) {
            user.filtroEspecialidadesSQL = ` AND s.IdServicio IN (${especialidades.join(',')})`;
          }
        }
      }
      
      next();
    } catch (error) {
      this.logger.error('Error en middleware de especialidades:', error);
      next(); // Continuar sin filtro en caso de error
    }
  }
}