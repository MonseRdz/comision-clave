import type { Gasto } from "./types";
import { cuentaComprobado, cuentaEnDictamen } from "./store";
import { suma } from "./dinero";

/** Gasto comprobado bajo el régimen "Sin comprobante fiscal". */
export const sinFactura = (g: Gasto) => g.tipoComprobante === "Sin comprobante fiscal";

const total = (gastos: Gasto[]) => gastos.reduce((s, g) => suma(s, g.montoMXN), 0);

/**
 * Cálculo del indicador "Comprobación sin factura".
 * El denominador es el mismo criterio de comprobado del resto del tablero:
 * solo gastos Aprobados.
 */
export function resumenSinFactura(gastos: Gasto[]) {
  const aprobados = gastos.filter(cuentaComprobado);
  const comprobado = total(aprobados);
  const monto = total(aprobados.filter(sinFactura));
  const enDictamen = total(gastos.filter((g) => cuentaEnDictamen(g) && sinFactura(g)));
  return {
    comprobado,
    monto,
    enDictamen,
    pct: comprobado ? Math.round((monto / comprobado) * 100) : 0,
  };
}
