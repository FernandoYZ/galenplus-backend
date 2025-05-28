// src/common/utils/validation.utils.ts

import { validarFormatoFecha } from "./date.utils";

/**
 * Valida número de documento peruano
 */
export function validarDocumentoPeruano(documento: string): {
  valido: boolean;
  tipo: 'DNI' | 'CE' | 'PASAPORTE' | 'UNKNOWN';
} {
  if (!documento) {
    return { valido: false, tipo: 'UNKNOWN' };
  }

  const doc = documento.trim();

  // DNI: 8 dígitos
  if (/^\d{8}$/.test(doc)) {
    return { valido: true, tipo: 'DNI' };
  }

  // Carnet de Extranjería: 9-12 caracteres alfanuméricos
  if (/^[A-Z0-9]{9,12}$/.test(doc)) {
    return { valido: true, tipo: 'CE' };
  }

  // Pasaporte: formato variable
  if (/^[A-Z0-9]{6,15}$/.test(doc)) {
    return { valido: true, tipo: 'PASAPORTE' };
  }

  return { valido: false, tipo: 'UNKNOWN' };
}

/**
 * Sanitiza texto para evitar inyección SQL
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  return text.replace(/['";\-\-\/\*]/g, '').trim();
}

/**
 * Valida rango de fechas
 */
export function validarRangoFechas(
  fechaInicio: string,
  fechaFin: string,
): boolean {
  if (!validarFormatoFecha(fechaInicio) || !validarFormatoFecha(fechaFin)) {
    return false;
  }

  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  return inicio <= fin;
}