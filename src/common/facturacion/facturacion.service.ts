import { Injectable, Logger } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../database/database.service';
import { BusinessException, handleSqlError } from '../utils/error.utils';
import {
  CrearCuentaAtencionDto,
  CrearOrdenServicioDto,
  DespacharServicioDto,
  CrearPagoOrdenDto,
  CrearRecetaCabeceraDto,
  CrearRecetaDetalleDto,
  FacturacionCuentaResponse,
  FacturacionOrdenResponse,
  FacturacionRecetaResponse,
  PagosServicioDto,
} from './interfaces/facturacion.interface';

@Injectable()
export class FacturacionService {
  private readonly logger = new Logger(FacturacionService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Crear cuenta de atención (contenedor principal de facturación)
   */
  async crearCuentaAtencion(
    datos: CrearCuentaAtencionDto,
  ): Promise<FacturacionCuentaResponse> {
    try {
      const pool = await this.databaseService.getMainConnection();

      const result = await pool
        .request()
        .input('TotalPorPagar', sql.Money, datos.totalPorPagar)
        .input('IdEstado', sql.Int, datos.idEstado || 1)
        .input('TotalPagado', sql.Money, datos.totalPagado || null)
        .input('TotalAsegurado', sql.Money, datos.totalAsegurado || null)
        .input('TotalExonerado', sql.Money, datos.totalExonerado || null)
        .input('HoraCierre', sql.Char(5), datos.horaCierre || null)
        .input('FechaCierre', sql.DateTime, datos.fechaCierre || null)
        .input('HoraApertura', sql.Char(5), datos.horaApertura)
        .input('FechaApertura', sql.DateTime, datos.fechaApertura)
        .input('IdPaciente', sql.Int, datos.idPaciente)
        .input('FechaCreacion', sql.DateTime, datos.fechaCreacion)
        .input('IdUsuarioAuditoria', sql.Int, datos.idUsuarioAuditoria)
        .output('IdCuentaAtencion', sql.Int)
        .execute('FacturacionCuentasAtencionAgregar');

      const idCuentaAtencion = result.output.IdCuentaAtencion;

      if (!idCuentaAtencion) {
        throw new BusinessException('Error al crear cuenta de atención');
      }

      this.logger.debug(`Cuenta de atención creada: ${idCuentaAtencion}`);
      return { idCuentaAtencion };
    } catch (error) {
      this.logger.error('Error al crear cuenta de atención:', error);
      handleSqlError(error);
    }
  }

  /**
   * Crear orden de servicio
   */
  async crearOrdenServicio(
    datos: CrearOrdenServicioDto,
  ): Promise<FacturacionOrdenResponse> {
    try {
      const pool = await this.databaseService.getMainConnection();

      const result = await pool
        .request()
        .input('IdPuntoCarga', sql.Int, datos.idPuntoCarga)
        .input('IdPaciente', sql.Int, datos.idPaciente)
        .input('IdCuentaAtencion', sql.Int, datos.idCuentaAtencion)
        .input('IdServicioPaciente', sql.Int, datos.idServicioPaciente)
        .input('idTipoFinanciamiento', sql.Int, datos.idTipoFinanciamiento)
        .input('idFuenteFinanciamiento', sql.Int, datos.idFuenteFinanciamiento)
        .input('FechaCreacion', sql.DateTime, datos.fechaCreacion)
        .input('IdUsuario', sql.Int, datos.idUsuario)
        .input('FechaDespacho', sql.DateTime, datos.fechaDespacho)
        .input('IdUsuarioDespacho', sql.Int, datos.idUsuarioDespacho)
        .input('IdEstadoFacturacion', sql.Int, datos.idEstadoFacturacion || 1)
        .input(
          'FechaHoraRealizaCpt',
          sql.DateTime,
          datos.fechaHoraRealizaCpt || null,
        )
        .input('IdUsuarioAuditoria', sql.Int, datos.idUsuarioAuditoria)
        .output('IdOrden', sql.Int)
        .execute('FactOrdenServicioAgregar');

      const idOrden = result.output.IdOrden;

      if (!idOrden) {
        throw new BusinessException('Error al crear orden de servicio');
      }

      this.logger.debug(`Orden de servicio creada: ${idOrden}`);
      return { idOrden };
    } catch (error) {
      this.logger.error('Error al crear orden de servicio:', error);
      handleSqlError(error);
    }
  }

  /**
   * Despachar servicio/producto en una orden
   */
  async despacharServicio(datos: DespacharServicioDto): Promise<void> {
    try {
      const pool = await this.databaseService.getMainConnection();

      await pool
        .request()
        .input('idOrden', sql.Int, datos.idOrden)
        .input('IdProducto', sql.Int, datos.idProducto)
        .input('Cantidad', sql.Int, datos.cantidad)
        .input('Precio', sql.Money, datos.precio)
        .input('Total', sql.Money, datos.total)
        .input('labConfHIS', sql.VarChar(3), datos.labConfHIS || '')
        .input('grupoHIS', sql.Int, datos.grupoHIS || 0)
        .input('subGrupoHIS', sql.Int, datos.subGrupoHIS || 0)
        .input('IdUsuarioAuditoria', sql.Int, datos.idUsuarioAuditoria)
        .input('idReceta', sql.Int, datos.idReceta || null)
        .input('idDiagnostico', sql.Int, datos.idDiagnostico || null)
        .input('labConfHIS2', sql.VarChar(3), datos.labConfHIS2 || null)
        .input('labConfHIS3', sql.VarChar(3), datos.labConfHIS3 || null)
        .input('PDR', sql.VarChar(3), datos.PDR || 'D')
        .execute('FacturacionServicioDespachoAgregar');

      this.logger.debug(
        `Servicio despachado en orden ${datos.idOrden}: producto ${datos.idProducto}`,
      );
    } catch (error) {
      this.logger.error('Error al despachar servicio:', error);
      handleSqlError(error);
    }
  }

  // Creación de datos para la tabla FacturacionServicioPagos
  async PagosServicio(datos: PagosServicioDto): Promise<void> {
    try {
      const pool = await this.databaseService.getMainConnection();
      await pool
        .request()
        .input('idOrdenPago', sql.Int, datos.idOrdenPago)
        .input('idProducto', sql.Int, datos.idProducto)
        .input('Cantidad', sql.Int, datos.Cantidad | 1)
        .input('Precio', sql.Money, datos.Precio)
        .input('Total', sql.Money, datos.Total)
        .query(`
          INSERT INTO FacturacionServicioPagos (
            idOrdenPago,
            idProducto,
            Cantidad,
            Precio,
            Total
          ) VALUES (
            @idOrdenPago,
            @idProducto,
            @Cantidad,
            @Precio,
            @Total
          )  
        `);

    } catch (er) {
      this.logger.error('Error al crear datos en la tabla FacturacionServicioPagos', er)
      handleSqlError(er);
    }
  }

  /**
   * Crear registro de pago para orden (solo para particulares)
   */
  async crearPagoOrden(datos: CrearPagoOrdenDto): Promise<void> {
    try {
      const pool = await this.databaseService.getMainConnection();

      await pool
        .request()
        .input('idComprobantePago', sql.Int, datos.idComprobantePago || null)
        .input('idOrden', sql.Int, datos.idOrden)
        .input('ImporteExonerado', sql.Money, datos.importeExonerado || 0.0)
        .input('FechaCreacion', sql.DateTime, datos.fechaCreacion)
        .input('IdUsuario', sql.Int, datos.idUsuario)
        .input('IdEstadoFacturacion', sql.Int, datos.idEstadoFacturacion || 1)
        .input('idUsuarioExonera', sql.Int, datos.idUsuarioExonera || 0).query(`
          INSERT INTO FactOrdenServicioPagos (
            idComprobantePago,
            idOrden,
            ImporteExonerado,
            FechaCreacion,
            IdUsuario,
            IdEstadoFacturacion,
            idUsuarioExonera
          )
          VALUES (
            @idComprobantePago,
            @idOrden,
            @ImporteExonerado,
            @FechaCreacion,
            @IdUsuario,
            @IdEstadoFacturacion,
            @idUsuarioExonera
          )
        `);

      this.logger.debug(`Pago creado para orden ${datos.idOrden}`);
    } catch (error) {
      this.logger.error('Error al crear pago de orden:', error);
      handleSqlError(error);
    }
  }

  /**
   * Crear cabecera de receta (farmacia)
   */
  async crearRecetaCabecera(
    datos: CrearRecetaCabeceraDto,
  ): Promise<FacturacionRecetaResponse> {
    try {
      const pool = await this.databaseService.getMainConnection();

      const result = await pool
        .request()
        .output('idReceta', sql.Int)
        .input('IdPuntoCarga', sql.Int, datos.idPuntoCarga)
        .input('FechaReceta', sql.DateTime, datos.fechaReceta)
        .input('idCuentaAtencion', sql.Int, datos.idCuentaAtencion)
        .input('idServicioReceta', sql.Int, datos.idServicioReceta)
        .input('idEstado', sql.Int, datos.idEstado || 1)
        .input('idComprobantePago', sql.Int, datos.idComprobantePago || null)
        .input('idMedicoReceta', sql.Int, datos.idMedicoReceta)
        .input('FechaVigencia', sql.DateTime, datos.fechaVigencia)
        .input('IdUsuarioAuditoria', sql.Int, datos.idUsuarioAuditoria)
        .execute('RecetaCabeceraAgregar');

      const idReceta = result.output.idReceta;

      if (!idReceta) {
        throw new BusinessException('Error al crear cabecera de receta');
      }

      this.logger.debug(`Receta creada: ${idReceta}`);
      return { idReceta };
    } catch (error) {
      this.logger.error('Error al crear cabecera de receta:', error);
      handleSqlError(error);
    }
  }

  /**
   * Agregar detalle a receta (medicamento)
   */
  async agregarDetalleReceta(datos: CrearRecetaDetalleDto): Promise<void> {
    try {
      const pool = await this.databaseService.getMainConnection();

      await pool
        .request()
        .input('idReceta', sql.Int, datos.idReceta)
        .input('idItem', sql.Int, datos.idItem)
        .input('CantidadPedida', sql.Int, datos.cantidadPedida)
        .input('Precio', sql.Money, datos.precio)
        .input('Total', sql.Money, datos.total)
        .input(
          'SaldoEnRegistroReceta',
          sql.Int,
          datos.saldoEnRegistroReceta || null,
        )
        .input(
          'SaldoEnDespachoReceta',
          sql.Int,
          datos.saldoEnDespachoReceta || null,
        )
        .input('CantidadDespachada', sql.Int, datos.cantidadDespachada || null)
        .input('idDosisRecetada', sql.Int, datos.idDosisRecetada || 1)
        .input('idEstadoDetalle', sql.Int, datos.idEstadoDetalle || 1)
        .input(
          'MotivoAnulacionMedico',
          sql.VarChar(300),
          datos.motivoAnulacionMedico || null,
        )
        .input('observaciones', sql.VarChar(300), datos.observaciones || null)
        .input(
          'IdViaAdministracion',
          sql.Int,
          datos.idViaAdministracion || null,
        )
        .input('iddiagnostico', sql.Int, datos.idDiagnostico || null)
        .input('IdUsuarioAuditoria', sql.Int, datos.idUsuarioAuditoria)
        .execute('RecetaDetalleAgregar');

    } catch (error) {
      this.logger.error('Error al agregar detalle de receta:', error);
      handleSqlError(error);
    }
  }

  /**
   * Obtener precio de producto por tipo de financiamiento
   */
  async obtenerPrecioProducto(
    idProducto: number,
    idTipoFinanciamiento: number,
  ): Promise<{
    precio: number;
    seUsaSinPrecio: boolean;
    activo: boolean;
  } | null> {
    try {
      const pool = await this.databaseService.getMainConnection();

      const result = await pool
        .request()
        .input('IdProducto', sql.Int, idProducto)
        .input('IdTipoFinanciamiento', sql.Int, idTipoFinanciamiento)
        .execute('FactCatalogoServiciosXidTipoFinanciamiento');

      if (result.recordset.length === 0) {
        return null;
      }

      const producto = result.recordset[0];
      return {
        precio: parseFloat(producto.PrecioUnitario || 0),
        seUsaSinPrecio: !!producto.SeUsaSinPrecio,
        activo: !!producto.Activo,
      };
    } catch (error) {
      this.logger.error('Error al obtener precio de producto:', error);
      return null;
    }
  }

  /**
   * Obtener información de especialidad para consulta
   */
  async obtenerProductoConsultaEspecialidad(
    idEspecialidad: number,
  ): Promise<number | null> {
    try {
      const pool = await this.databaseService.getMainConnection();

      const result = await pool
        .request()
        .input('IdEspecialidad', sql.Int, idEspecialidad)
        .execute('FactCatalogoServiciosSeleccionarTipoConsulta');

      if (result.recordset.length > 0) {
        return result.recordset[0].IdProducto;
      }

      return 4584; // ID por defecto para consulta general
    } catch (error) {
      this.logger.warn(
        'Error al obtener producto de consulta, usando default:',
        error,
      );
      return 4584;
    }
  }

  /**
   * Helper: Crear facturación completa para cita (ESTRATEGIA)
   */
  async crearFacturacionCitaEstrategia(datos: {
    idPaciente: number;
    idServicio: number;
    horaApertura: string;
    fechaCreacion: Date;
    idUsuario: number;
    idProductoConsulta: number;
  }): Promise<{ idCuentaAtencion: number; idOrden: number }> {
    // 1. Crear cuenta de atención
    const cuenta = await this.crearCuentaAtencion({
      totalPorPagar: 0.0,
      totalPagado: 0.0,
      totalAsegurado: 0.0,
      totalExonerado: 0.0,
      horaApertura: datos.horaApertura,
      fechaApertura: datos.fechaCreacion,
      idPaciente: datos.idPaciente,
      fechaCreacion: datos.fechaCreacion,
      idUsuarioAuditoria: datos.idUsuario,
    });

    // 2. Crear orden de servicio
    const orden = await this.crearOrdenServicio({
      idPuntoCarga: 6,
      idPaciente: datos.idPaciente,
      idCuentaAtencion: cuenta.idCuentaAtencion,
      idServicioPaciente: datos.idServicio,
      idTipoFinanciamiento: 16, // ESTRATEGIA
      idFuenteFinanciamiento: 9, // ESTRATEGIA
      fechaCreacion: datos.fechaCreacion,
      idUsuario: datos.idUsuario,
      fechaDespacho: datos.fechaCreacion,
      idUsuarioDespacho: datos.idUsuario,
      idUsuarioAuditoria: datos.idUsuario,
    });

    // 3. Despachar consulta
    await this.despacharServicio({
      idOrden: orden.idOrden,
      idProducto: datos.idProductoConsulta,
      cantidad: 1,
      precio: 0.0,
      total: 0.0,
      idUsuarioAuditoria: datos.idUsuario,
    });

    return {
      idCuentaAtencion: cuenta.idCuentaAtencion,
      idOrden: orden.idOrden,
    };
  }

  /**
   * Helper: Crear facturación completa para cita PARTICULAR
   */
  async crearFacturacionCitaParticular(datos: {
    idPaciente: number;
    idServicio: number;
    horaApertura: string;
    fechaCreacion: Date;
    idUsuario: number;
    idProductoConsulta: number;
    precioUnitario: number;
    totalPagar: number;
  }): Promise<{ idCuentaAtencion: number; idOrden: number }> {
    // 1. Crear cuenta de atención
    const cuenta = await this.crearCuentaAtencion({
      totalPorPagar: datos.totalPagar,
      totalPagado: 0.0,
      totalAsegurado: 0.0,
      totalExonerado: 0.0,
      horaApertura: datos.horaApertura,
      fechaApertura: datos.fechaCreacion,
      idPaciente: datos.idPaciente,
      fechaCreacion: datos.fechaCreacion,
      idUsuarioAuditoria: datos.idUsuario,
    });

    // 2. Crear orden de servicio
    const orden = await this.crearOrdenServicio({
      idPuntoCarga: 6,
      idPaciente: datos.idPaciente,
      idCuentaAtencion: cuenta.idCuentaAtencion,
      idServicioPaciente: datos.idServicio,
      idTipoFinanciamiento: 1, // PARTICULAR
      idFuenteFinanciamiento: 5, // PARTICULAR
      fechaCreacion: datos.fechaCreacion,
      idUsuario: datos.idUsuario,
      fechaDespacho: datos.fechaCreacion,
      idUsuarioDespacho: datos.idUsuario,
      idUsuarioAuditoria: datos.idUsuario,
    });

    // 3. Crear pago particular
    await this.crearPagoOrden({
      idOrden: orden.idOrden,
      importeExonerado: 0.0,
      fechaCreacion: datos.fechaCreacion,
      idUsuario: datos.idUsuario,
    });

    // 4. Despachar consulta
    await this.despacharServicio({
      idOrden: orden.idOrden,
      idProducto: datos.idProductoConsulta,
      cantidad: 1,
      precio: datos.precioUnitario,
      total: datos.totalPagar,
      idUsuarioAuditoria: datos.idUsuario,
    });

    return {
      idCuentaAtencion: cuenta.idCuentaAtencion,
      idOrden: orden.idOrden,
    };
  }
}
