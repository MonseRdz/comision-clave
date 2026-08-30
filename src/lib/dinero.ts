import Decimal from "decimal.js";

/** Suma exacta de montos monetarios. */
export function suma(...montos: number[]): number {
  return montos.reduce((acc, m) => new Decimal(acc).plus(m).toNumber(), 0);
}

/** Resta exacta de montos monetarios. */
export function resta(a: number, b: number): number {
  return new Decimal(a).minus(b).toNumber();
}

/** Multiplica un monto por un tipo de cambio con precisión decimal. */
export function convertirMoneda(monto: number, tipoCambio: number): number {
  return new Decimal(monto).times(tipoCambio).toDecimalPlaces(2).toNumber();
}

/** Compara dos montos con tolerancia de 1 centavo. */
export function sonIguales(a: number, b: number, tolerancia: number = 0.01): boolean {
  return new Decimal(a).minus(b).abs().lessThanOrEqualTo(tolerancia);
}

/** Redondea un monto a 2 decimales exactos. */
export function redondear(monto: number): number {
  return new Decimal(monto).toDecimalPlaces(2).toNumber();
}
