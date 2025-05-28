/**
 * Obtiene la fecha y hora actual en la zona horaria de Lima, Perú (UTC-5)
 */
export function obtenerFechaHoraLima(): Date {
  const now = new Date();
  // Ajustar a la zona horaria de Lima (UTC-5)
  return new Date(now.getTime() - 5 * 60 * 60 * 1000);
}

/**
 * Convierte una fecha a formato ISO de Lima
 */
export function fechaLimaToISO(fecha?: Date): string {
  const fechaLima = fecha || obtenerFechaHoraLima();
  return fechaLima.toISOString();
}

/**
 * Obtiene solo la fecha sin hora en formato YYYY-MM-DD
 */
export function obtenerFechaSinHora(fecha?: Date): string {
  const fechaLima = fecha || obtenerFechaHoraLima();
  return fechaLima.toISOString().split('T')[0];
}

/**
 * Obtiene solo la hora en formato HH:MM
 */
export function obtenerHoraFormateada(fecha?: Date): string {
  const fechaLima = fecha || obtenerFechaHoraLima();
  return fechaLima.toTimeString().substring(0, 5);
}

/**
 * Valida formato de fecha YYYY-MM-DD
 */
export function validarFormatoFecha(fecha: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha);
}

/**
 * Valida formato de hora HH:MM en 24 horas
 */
export function validarFormatoHora(hora: string): boolean {
  return /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/.test(hora);
}

/**
 * Calcula la edad basada en fecha de nacimiento
 */
export function calcularEdad(
  fechaNacimiento: Date,
  fechaReferencia?: Date,
): {
  valor: number;
  tipo: 1 | 2 | 3; // 1: años, 2: meses, 3: días
} {
  const fechaCita = fechaReferencia || obtenerFechaHoraLima();
  const nacimiento = new Date(fechaNacimiento);

  let years = fechaCita.getFullYear() - nacimiento.getFullYear();
  const mes = fechaCita.getMonth() - nacimiento.getMonth();
  const dia = fechaCita.getDate() - nacimiento.getDate();

  // Si aún no ha cumplido años este año, restamos uno
  if (mes < 0 || (mes === 0 && dia < 0)) {
    years--;
  }

  // Calcular diferencia en meses
  let meses =
    (fechaCita.getFullYear() - nacimiento.getFullYear()) * 12 +
    (fechaCita.getMonth() - nacimiento.getMonth());
  if (fechaCita.getDate() < nacimiento.getDate()) {
    meses--;
  }

  // Calcular diferencia en días
  const diffTime = fechaCita.getTime() - nacimiento.getTime();
  const dias = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Determinar tipo de edad y valor automáticamente
  if (years > 0) {
    return { valor: years, tipo: 1 }; // Años
  } else if (meses > 0) {
    return { valor: meses, tipo: 2 }; // Meses
  } else {
    return { valor: dias, tipo: 3 }; // Días
  }
}

