import type { ComprobantePago, Gasto } from "./types";
import { redondear, resta, suma } from "./dinero";
import { esGastoTransporte } from "./transporte";
import { montoComprobable } from "./store";

/** Suma de los abonos capturados en el comprobante de pago. */
export const sumaAbonos = (p: ComprobantePago | undefined) =>
  redondear((p?.abonos ?? []).reduce((s, a) => suma(s, Number(a.monto) || 0), 0));

/**
 * Monto contra el que se concilia el desembolso: el total de la factura, salvo
 * en Transporte, donde manda el monto respaldado por pases (regla por viajero).
 */
export const baseConciliacion = (g: Gasto) =>
  esGastoTransporte(g) ? montoComprobable(g) : g.montoMXN;

/** Diferencia entre lo desembolsado y la base de conciliación. */
export const diferenciaPago = (g: Gasto) => redondear(resta(sumaAbonos(g.pago), baseConciliacion(g)));

/** El desembolso cuadra con la base (tolerancia de un centavo). */
export const pagoConciliado = (g: Gasto) =>
  Boolean(g.pago && (g.pago.abonos ?? []).length) && Math.abs(diferenciaPago(g)) <= 0.01;

/** Abonos de una factura PPD que aún no tienen su complemento de pago (REP). */
export const abonosSinREP = (p: ComprobantePago | undefined) =>
  p && p.esPPD && p.tipoDesembolso === "Pago directo al proveedor"
    ? (p.abonos ?? []).filter((a) => !a.rep).length
    : 0;

/** Gastos aprobados cuyo comprobante de pago sigue pendiente. */
export const aprobadoConPagoPendiente = (g: Gasto) => g.estatus === "Aprobado" && g.pagoPendiente;
