export interface PacienteBasico {
  idPaciente: number;
  tipoDocumento: string;
  nroDocumento: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento?: Date;
  nroHistoriaClinica?: number;
}

export interface PacienteCompleto extends PacienteBasico {
  edad?: {
    valor: number;
    tipo: 1 | 2 | 3; // años, meses, días
    texto: string;
  };
  datosAdicionales?: {
    antecedentes?: string;
    antecedAlergico?: string;
    antecedObstetrico?: string;
    antecedQuirurgico?: string;
    antecedFamiliar?: string;
    antecedPatologico?: string;
  };
}

export interface ValidacionPaciente {
  success?: boolean;
  existePaciente: boolean;
  tieneSHC: boolean; // Sistema Historia Clínica
  paciente?: PacienteBasico;
  mensaje: string;
}

interface PacienteResponse {
  idPaciente: number;
  tipoDocumento: string;
  nroDocumento: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento: string; // ISO date string
  nroHistoriaClinica: number;
}

export interface ValidarResponse {
  success: boolean,
  message: string,
  existePaciente: boolean,
  tieneSHC: boolean,
  paciente: PacienteResponse
}