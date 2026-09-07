import type { Archivo, Gasto, Viajero } from "./types";
import { redondear, resta, suma } from "./dinero";

/** Rubro al que aplica la comprobación por viajero. */
export const RUBRO_TRANSPORTE = "Transporte";

export const esGastoTransporte = (g: Gasto) => g.rubro === RUBRO_TRANSPORTE;

/**
 * Hay factura que ampara el total cuando el régimen no es "Sin comprobante
 * fiscal" y existe al menos un documento del gasto que no sea un pase de
 * abordar de un viajero.
 */
export const tieneFactura = (g: Gasto) =>
  g.tipoComprobante !== "Sin comprobante fiscal" &&
  (g.archivos ?? []).some((a) => !a.participanteId);

/** Reparto uniforme del total entre los viajeros; el último absorbe el redondeo. */
export function repartoUniforme(total: number, ids: string[]): Viajero[] {
  if (!ids.length) return [];
  const parte = redondear(total / ids.length);
  return ids.map((participanteId, i) => ({
    participanteId,
    importe:
      i === ids.length - 1 ? redondear(resta(total, redondear(parte * (ids.length - 1)))) : parte,
  }));
}

export type FilaViajero = {
  participanteId: string;
  importe: number;
  ida: boolean;
  regreso: boolean;
  completo: boolean;
  pendiente: number;
};

const tieneTramo = (archivos: Archivo[], id: string, tramo: "Ida" | "Regreso") =>
  archivos.some(
    (a) =>
      a.participanteId === id &&
      // Los pases migrados no traen tramo: cuentan como un solo tramo (ida).
      ((a.tramo ?? "Ida") === tramo),
  );

/** Desglose por viajero: importe individual, pases y monto pendiente. */
export function desgloseViajeros(g: Gasto): FilaViajero[] {
  if (!esGastoTransporte(g)) return [];
  const asignados = (g.viajeros ?? []).filter((v) => v.participanteId);
  const ids = asignados.length ? asignados.map((v) => v.participanteId) : g.participantesIds ?? [];
  if (!ids.length) return [];
  const base = asignados.length ? asignados : repartoUniforme(g.montoMXN, ids);
  const archivos = g.archivos ?? [];
  const conFactura = tieneFactura(g);
  return ids.map((id) => {
    const importe = Number(base.find((v) => v.participanteId === id)?.importe ?? 0);
    const ida = tieneTramo(archivos, id, "Ida");
    const regreso = tieneTramo(archivos, id, "Regreso");
    const completo = ida && regreso && conFactura;
    return { participanteId: id, importe, ida, regreso, completo, pendiente: completo ? 0 : importe };
  });
}

/** Suma de los importes individuales capturados. */
export const sumaViajeros = (viajeros: Viajero[]) =>
  viajeros.reduce((s, v) => suma(s, Number(v.importe) || 0), 0);

/**
 * Monto del gasto que se toma como efectivamente comprobado.
 * Fuera de Transporte es el total; en Transporte requiere factura y, por
 * viajero, pase de ida y de regreso.
 */
export function comprobadoDe(g: Gasto): number {
  if (!esGastoTransporte(g)) return g.montoMXN;
  if (!tieneFactura(g)) return 0;
  const filas = desgloseViajeros(g);
  if (!filas.length) return g.montoMXN;
  const total = filas.filter((v) => v.completo).reduce((s, v) => suma(s, v.importe), 0);
  return Math.min(redondear(total), g.montoMXN);
}

/** Parte del gasto que sigue pendiente de comprobar por evidencia faltante. */
export const pendienteDe = (g: Gasto) => redondear(resta(g.montoMXN, comprobadoDe(g)));
