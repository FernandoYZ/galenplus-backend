export interface CrearCuentaAtencionDto {
  totalPorPagar: number;
  idEstado?: number;
  totalPagado?: number;
  totalAsegurado?: number;
  totalExonerado?: number;
  horaCierre?: string;
  fechaCierre?: Date;
  horaApertura: string;
  fechaApertura: Date;
  idPaciente: number;
  fechaCreacion: Date;
  idUsuarioAuditoria: number;
}

export interface CrearOrdenServicioDto {
  idPuntoCarga: number;
  idPaciente: number;
  idCuentaAtencion: number;
  idServicioPaciente: number;
  idTipoFinanciamiento: number;
  idFuenteFinanciamiento: number;
  fechaCreacion: Date;
  idUsuario: number;
  fechaDespacho: Date;
  idUsuarioDespacho: number;
  idEstadoFacturacion?: number;
  fechaHoraRealizaCpt?: Date;
  idUsuarioAuditoria: number;
}

export interface DespacharServicioDto {
  idOrden: number;
  idProducto: number;
  cantidad: number;
  precio: number;
  total: number;
  labConfHIS?: string;
  grupoHIS?: number;
  subGrupoHIS?: number;
  idUsuarioAuditoria: number;
  idReceta?: number;
  idDiagnostico?: number;
  labConfHIS2?: string;
  labConfHIS3?: string;
  PDR?: string;
}

export interface PagosServicioDto {
  idOrdenPago: number;
  idProducto: number;
  Cantidad: number;
  Precio: string;
  Total: string;
}

export interface CrearPagoOrdenDto {
  idComprobantePago?: number;
  idOrden: number;
  importeExonerado?: number;
  fechaCreacion: Date;
  idUsuario: number;
  idEstadoFacturacion?: number;
  idUsuarioExonera?: number;
}

export interface CrearRecetaCabeceraDto {
  idPuntoCarga: number;
  fechaReceta: Date;
  idCuentaAtencion: number;
  idServicioReceta: number;
  idEstado?: number;
  idComprobantePago?: number;
  idMedicoReceta: number;
  fechaVigencia: Date;
  idUsuarioAuditoria: number;
}

export interface CrearRecetaDetalleDto {
  idReceta: number;
  idItem: number;
  cantidadPedida: number;
  precio: number;
  total: number;
  saldoEnRegistroReceta?: number;
  saldoEnDespachoReceta?: number;
  cantidadDespachada?: number;
  idDosisRecetada?: number;
  idEstadoDetalle?: number;
  motivoAnulacionMedico?: string;
  observaciones?: string;
  idViaAdministracion?: number;
  idDiagnostico?: number;
  idUsuarioAuditoria: number;
}

// Respuestas de los servicios
export interface FacturacionCuentaResponse {
  idCuentaAtencion: number;
}

export interface FacturacionOrdenResponse {
  idOrden: number;
}

export interface FacturacionRecetaResponse {
  idReceta: number;
}