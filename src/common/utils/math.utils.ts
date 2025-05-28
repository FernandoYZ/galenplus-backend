// src/common/utils/math.utils.ts
/**
 * Redondea un número a 2 decimales
 */
export function redondearDosDecimales(numero: number): number {
  return Math.round(numero * 100) / 100;
}

/**
 * Calcula el total de un precio por cantidad
 */
export function calcularTotal(precio: number, cantidad: number): number {
  return redondearDosDecimales(precio * cantidad);
}