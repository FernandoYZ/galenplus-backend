import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as sql from 'mssql';
import { 
  DatabaseService, 
  AuditService,
  BusinessException,
  validarDocumentoPeruano,
  calcularEdad,
  obtenerFechaHoraLima,
  sanitizeText
} from '../common';
import { 
  ActualizarDatosAdicionalesDto,
} from './dto/pacientes.dto';
import { PacienteBasico, PacienteCompleto, ValidacionPaciente } from './interfaces/paciente.interface';

@Injectable()
export class PacientesService {
  private readonly logger = new Logger(PacientesService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Valida un paciente por número de documento (compatibilidad con Express)
   */
  async validarPaciente(nroDocumento: string): Promise<ValidacionPaciente> {
    try {
      if (!nroDocumento) {
        throw new BusinessException('El número de documento es requerido');
      }

      // Validar formato del documento
      const validacionDoc = validarDocumentoPeruano(nroDocumento);
      if (!validacionDoc.valido) {
        throw new BusinessException('Formato de documento inválido');
      }

      const pool = await this.databaseService.getMainConnection();

      const pacienteResult = await pool
        .request()
        .input('NroDocumento', sql.VarChar(50), nroDocumento)
        .query(`
          SELECT 
            pa.IdPaciente,
            TDI.Descripcion as TipoDocumento,
            pa.NroDocumento,
            pa.ApellidoPaterno + ' ' + pa.ApellidoMaterno AS ApellidosPaciente,
            UPPER(RTRIM(pa.PrimerNombre + ' ' + ISNULL(PA.SegundoNombre, '') + ' ' + ISNULL(PA.TercerNombre,''))) AS NombrePaciente,
            pa.NroHistoriaClinica,
            PA.FechaNacimiento
          FROM Pacientes PA 
          INNER JOIN TiposDocIdentidad TDI on PA.IdDocIdentidad=TDI.IdDocIdentidad
          WHERE NroDocumento=@NroDocumento
        `);

      if (!pacienteResult.recordset || pacienteResult.recordset.length === 0) {
        return {
          existePaciente: false,
          tieneSHC: false,
          mensaje: 'No se encontró al paciente',
        };
      }

      const pacienteData = pacienteResult.recordset[0];

      // Verificar si tiene historia clínica
      if (!pacienteData.NroHistoriaClinica) {
        return {
          existePaciente: true,
          tieneSHC: false,
          mensaje: 'Paciente encontrado pero no tiene Historia Clínica asignada',
          paciente: {
            idPaciente: pacienteData.IdPaciente,
            tipoDocumento: pacienteData.TipoDocumento || 'DNI',
            nroDocumento: nroDocumento,
            nombre: pacienteData.NombrePaciente || '',
            apellidos: pacienteData.ApellidosPaciente || '',
            fechaNacimiento: pacienteData.FechaNacimiento,
          },
        };
      }

      return {
        existePaciente: true,
        tieneSHC: true,
        mensaje: 'Paciente encontrado',
        paciente: {
          idPaciente: pacienteData.IdPaciente,
          tipoDocumento: pacienteData.TipoDocumento || 'DNI',
          nroDocumento: nroDocumento,
          nombre: pacienteData.NombrePaciente || '',
          apellidos: pacienteData.ApellidosPaciente || '',
          fechaNacimiento: pacienteData.FechaNacimiento,
          nroHistoriaClinica: pacienteData.NroHistoriaClinica,
        },
      };
    } catch (error) {
      this.logger.error('Error al validar paciente:', error);
      if (error instanceof BusinessException) {
        throw error;
      }
      throw new BusinessException('Error al validar paciente');
    }
  }

  /**
   * Buscar paciente por documento con datos completos
   */
  async buscarPacientePorDocumento(nroDocumento: string): Promise<PacienteCompleto | null> {
    try {
      const validacion = await this.validarPaciente(nroDocumento);
      
      if (!validacion.existePaciente || !validacion.paciente) {
        return null;
      }

      const pacienteBasico = validacion.paciente;

      // Obtener datos adicionales
      const datosAdicionales = await this.obtenerDatosAdicionales(pacienteBasico.idPaciente);

      // Calcular edad si tiene fecha de nacimiento
      let edad: PacienteCompleto['edad'];
      if (pacienteBasico.fechaNacimiento) {
        const edadCalculada = calcularEdad(new Date(pacienteBasico.fechaNacimiento));
        edad = {
          ...edadCalculada,
          texto: `${edadCalculada.valor} ${
            edadCalculada.tipo === 1 ? 'años' : 
            edadCalculada.tipo === 2 ? 'meses' : 'días'
          }`,
        };
      }

      return {
        ...pacienteBasico,
        edad,
        datosAdicionales,
      };
    } catch (error) {
      this.logger.error('Error al buscar paciente:', error);
      throw new BusinessException('Error al buscar paciente');
    }
  }

  /**
   * Obtener paciente por ID
   */
  async obtenerPacientePorId(idPaciente: number): Promise<PacienteCompleto | null> {
    try {
      const pool = await this.databaseService.getMainConnection();

      const pacienteResult = await pool
        .request()
        .input('IdPaciente', sql.Int, idPaciente)
        .query(`
          SELECT 
            pa.IdPaciente,
            TDI.Descripcion as TipoDocumento,
            pa.NroDocumento,
            pa.ApellidoPaterno + ' ' + pa.ApellidoMaterno AS ApellidosPaciente,
            UPPER(RTRIM(pa.PrimerNombre + ' ' + ISNULL(PA.SegundoNombre, '') + ' ' + ISNULL(PA.TercerNombre,''))) AS NombrePaciente,
            pa.NroHistoriaClinica,
            PA.FechaNacimiento
          FROM Pacientes PA 
          INNER JOIN TiposDocIdentidad TDI on PA.IdDocIdentidad=TDI.IdDocIdentidad
          WHERE pa.IdPaciente = @IdPaciente
        `);

      if (!pacienteResult.recordset.length) {
        return null;
      }

      const pacienteData = pacienteResult.recordset[0];

      // Obtener datos adicionales
      const datosAdicionales = await this.obtenerDatosAdicionales(idPaciente);

      // Calcular edad
      let edad: PacienteCompleto['edad'];
      if (pacienteData.FechaNacimiento) {
        const edadCalculada = calcularEdad(new Date(pacienteData.FechaNacimiento));
        edad = {
          ...edadCalculada,
          texto: `${edadCalculada.valor} ${
            edadCalculada.tipo === 1 ? 'años' : 
            edadCalculada.tipo === 2 ? 'meses' : 'días'
          }`,
        };
      }

      return {
        idPaciente: pacienteData.IdPaciente,
        tipoDocumento: pacienteData.TipoDocumento,
        nroDocumento: pacienteData.NroDocumento,
        nombre: pacienteData.NombrePaciente,
        apellidos: pacienteData.ApellidosPaciente,
        fechaNacimiento: pacienteData.FechaNacimiento,
        nroHistoriaClinica: pacienteData.NroHistoriaClinica,
        edad,
        datosAdicionales,
      };
    } catch (error) {
      this.logger.error('Error al obtener paciente por ID:', error);
      throw new BusinessException('Error al obtener datos del paciente');
    }
  }

  /**
   * Obtener datos adicionales del paciente (antecedentes)
   */
  async obtenerDatosAdicionales(idPaciente: number) {
    try {
      const pool = await this.databaseService.getMainConnection();

      const result = await pool
        .request()
        .input('idPaciente', sql.Int, idPaciente)
        .query(`
          SELECT 
            antecedentes,
            antecedAlergico,
            antecedObstetrico,
            antecedQuirurgico,
            antecedFamiliar,
            antecedPatologico
          FROM PacientesDatosAdicionales 
          WHERE idPaciente = @idPaciente
        `);

      return result.recordset.length > 0 ? result.recordset[0] : null;
    } catch (error) {
      this.logger.warn('Error al obtener datos adicionales:', error);
      return null;
    }
  }

  /**
   * Actualizar o crear datos adicionales del paciente
   */
  async actualizarDatosAdicionales(
    idPaciente: number,
    datos: ActualizarDatosAdicionalesDto,
    idUsuario: number,
  ): Promise<void> {
    try {
      const pool = await this.databaseService.getMainConnection();

      // Verificar si ya existen datos adicionales
      const existeResult = await pool
        .request()
        .input('idPaciente', sql.Int, idPaciente)
        .query(`
          SELECT COUNT(*) as Total 
          FROM PacientesDatosAdicionales 
          WHERE idPaciente = @idPaciente
        `);

      const existe = existeResult.recordset[0].Total > 0;

      // Sanitizar datos
      const datosSanitizados = {
        antecedQuirurgico: datos.antecedQuirurgico ? sanitizeText(datos.antecedQuirurgico) : null,
        antecedPatologico: datos.antecedPatologico ? sanitizeText(datos.antecedPatologico) : null,
        antecedObstetrico: datos.antecedObstetrico ? sanitizeText(datos.antecedObstetrico) : null,
        antecedAlergico: datos.antecedAlergico ? sanitizeText(datos.antecedAlergico) : null,
        antecedFamiliar: datos.antecedFamiliar ? sanitizeText(datos.antecedFamiliar) : null,
        antecedentes: datos.antecedentes ? sanitizeText(datos.antecedentes) : null,
      };

      if (existe) {
        // Actualizar
        await pool
          .request()
          .input('idPaciente', sql.Int, idPaciente)
          .input('antecedQuirurgico', sql.VarChar(500), datosSanitizados.antecedQuirurgico)
          .input('antecedPatologico', sql.VarChar(500), datosSanitizados.antecedPatologico)
          .input('antecedObstetrico', sql.VarChar(500), datosSanitizados.antecedObstetrico)
          .input('antecedAlergico', sql.VarChar(500), datosSanitizados.antecedAlergico)
          .input('antecedFamiliar', sql.VarChar(500), datosSanitizados.antecedFamiliar)
          .input('antecedentes', sql.VarChar(500), datosSanitizados.antecedentes)
          .query(`
            UPDATE PacientesDatosAdicionales
            SET 
              antecedQuirurgico = @antecedQuirurgico,
              antecedPatologico = @antecedPatologico,
              antecedObstetrico = @antecedObstetrico,
              antecedAlergico = @antecedAlergico,
              antecedFamiliar = @antecedFamiliar,
              antecedentes = @antecedentes
            WHERE idPaciente = @idPaciente
          `);

        await this.auditService.registrarAuditoria({
          idEmpleado: idUsuario,
          accion: 'M',
          idRegistro: idPaciente,
          tabla: 'PacientesDatosAdicionales',
          observaciones: 'Actualización de antecedentes',
        });
      } else {
        // Insertar
        await pool
          .request()
          .input('idPaciente', sql.Int, idPaciente)
          .input('antecedQuirurgico', sql.VarChar(500), datosSanitizados.antecedQuirurgico)
          .input('antecedPatologico', sql.VarChar(500), datosSanitizados.antecedPatologico)
          .input('antecedObstetrico', sql.VarChar(500), datosSanitizados.antecedObstetrico)
          .input('antecedAlergico', sql.VarChar(500), datosSanitizados.antecedAlergico)
          .input('antecedFamiliar', sql.VarChar(500), datosSanitizados.antecedFamiliar)
          .input('antecedentes', sql.VarChar(500), datosSanitizados.antecedentes)
          .query(`
            INSERT INTO PacientesDatosAdicionales (
              idPaciente, antecedQuirurgico, antecedPatologico, 
              antecedObstetrico, antecedAlergico, antecedFamiliar, antecedentes
            ) VALUES (
              @idPaciente, @antecedQuirurgico, @antecedPatologico,
              @antecedObstetrico, @antecedAlergico, @antecedFamiliar, @antecedentes
            )
          `);

        await this.auditService.registrarAuditoria({
          idEmpleado: idUsuario,
          accion: 'A',
          idRegistro: idPaciente,
          tabla: 'PacientesDatosAdicionales',
          observaciones: 'Creación de antecedentes',
        });
      }

      this.logger.log(`Datos adicionales ${existe ? 'actualizados' : 'creados'} para paciente ${idPaciente}`);
    } catch (error) {
      this.logger.error('Error al actualizar datos adicionales:', error);
      throw new BusinessException('Error al actualizar datos del paciente');
    }
  }

  /**
   * Buscar pacientes por nombre o documento (para autocompletado)
   */
  async buscarPacientes(termino: string, limite: number = 10): Promise<PacienteBasico[]> {
    try {
      if (!termino || termino.length < 2) {
        return [];
      }

      const terminoSanitizado = sanitizeText(termino);
      const pool = await this.databaseService.getMainConnection();

      const result = await pool
        .request()
        .input('termino', sql.VarChar(100), `%${terminoSanitizado}%`)
        .query(`
          SELECT TOP ${limite}
            pa.IdPaciente,
            TDI.Descripcion as TipoDocumento,
            pa.NroDocumento,
            pa.ApellidoPaterno + ' ' + pa.ApellidoMaterno AS ApellidosPaciente,
            UPPER(RTRIM(LTRIM(pa.PrimerNombre + ' ' + ISNULL(PA.SegundoNombre, '') + ' ' + ISNULL(PA.TercerNombre,'')))) AS NombrePaciente,
            pa.NroHistoriaClinica,
            PA.FechaNacimiento
          FROM Pacientes PA 
          INNER JOIN TiposDocIdentidad TDI on PA.IdDocIdentidad=TDI.IdDocIdentidad
          WHERE 
            pa.NroDocumento LIKE @termino
            OR pa.PrimerNombre LIKE @termino
            OR pa.ApellidoPaterno LIKE @termino
            OR pa.ApellidoMaterno LIKE @termino
          ORDER BY pa.ApellidoPaterno, pa.PrimerNombre
        `);

      return result.recordset.map((row:any) => ({
        idPaciente: row.IdPaciente,
        tipoDocumento: row.TipoDocumento,
        nroDocumento: row.NroDocumento,
        nombre: row.NombrePaciente,
        apellidos: row.ApellidosPaciente,
        fechaNacimiento: row.FechaNacimiento,
        nroHistoriaClinica: row.NroHistoriaClinica,
      }));
    } catch (error) {
      this.logger.error('Error al buscar pacientes:', error);
      throw new BusinessException('Error al buscar pacientes');
    }
  }

  /**
   * Obtener condición materna según el sexo del paciente
   */
  async obtenerCondicionMaterna(idPaciente: number): Promise<Array<{ id: number; label: string }>> {
    try {
      const pool = await this.databaseService.getMainConnection();

      const result = await pool
        .request()
        .input('IdPaciente', sql.Int, idPaciente)
        .query(`SELECT IdTipoSexo FROM Pacientes WHERE IdPaciente = @IdPaciente`);

      const sexoPaciente = result.recordset[0]?.IdTipoSexo;

      if (sexoPaciente === 2) {
        // Mujer
        return [
          { id: 1, label: 'Gestante' },
          { id: 2, label: 'Puerpera' },
          { id: 3, label: 'Ninguna' },
        ];
      } else {
        return [{ id: 3, label: 'Ninguna' }];
      }
    } catch (error) {
      this.logger.error('Error al obtener condición materna:', error);
      return [{ id: 3, label: 'Ninguna' }];
    }
  }
}