import type { Documentacion, Gasto, IncrementoDocumentacion } from "./types";
import { redondear, resta } from "./dinero";
import { comprobadoDe, desgloseViajeros } from "./transporte";

/** Saldo del gasto que hoy no tiene evidencia suficiente. */
export const saldoSinEvidencia = (g: Gasto) => redondear(resta(g.montoMXN, comprobadoDe(g)));

/** Documentación abierta del gasto (saldo con dueño y fecha compromiso). */
export function documentacionAbierta(g: Gasto): Documentacion | null {
  const d = g.documentacion;
  if (!d || d.estatus !== "Abierto") return null;
  return Number(d.monto) > 0 ? d : null;
}

/** El gasto está aprobado y arrastra un saldo en documentación. */
export const tieneSaldoEnDocumentacion = (g: Gasto) =>
  g.estatus === "Aprobado" && Boolean(documentacionAbierta(g));

/** Saldo vivo en documentación (cero cuando no hay). */
export const saldoEnDocumentacion = (g: Gasto) =>
  tieneSaldoEnDocumentacion(g) ? redondear(Number(g.documentacion?.monto) || 0) : 0;

/** El saldo se marcó como reintegro: ya no espera evidencia. */
export const marcadoReintegro = (g: Gasto) =>
  g.documentacion?.estatus === "Reintegro" && Number(g.documentacion.monto) > 0;

/** Saldo marcado para reintegro (cero cuando no hay). */
export const saldoReintegro = (g: Gasto) =>
  marcadoReintegro(g) ? redondear(Number(g.documentacion?.monto) || 0) : 0;

/**
 * Gasto aprobado cuyo saldo pendiente no tiene destino: ni documentación
 * abierta ni marca de reintegro. Nunca debe quedar así.
 */
export const saldoSinDestino = (g: Gasto) =>
  g.estatus === "Aprobado" &&
  saldoSinEvidencia(g) > 0 &&
  !documentacionAbierta(g) &&
  !marcadoReintegro(g);

/** Incremento en circuito de dictamen sobre el saldo abierto. */
export const incrementoDe = (g: Gasto): IncrementoDocumentacion | null =>
  documentacionAbierta(g)?.incremento ?? null;

export const esperaRevisionIncremento = (g: Gasto) => incrementoDe(g)?.estatus === "En revisión";

export const incrementoValidado = (g: Gasto) =>
  incrementoDe(g)?.estatus === "Validado por Revisor";

/** Saldo que ya se puede cerrar porque la evidencia nueva lo respalda. */
export function montoPorCerrar(g: Gasto): number {
  const d = documentacionAbierta(g);
  if (!d) return 0;
  const saldoReal = saldoSinEvidencia(g);
  return Math.max(0, redondear(resta(Number(d.monto) || 0, saldoReal)));
}

/** Documentación con el incremento enviado a validación técnica del Revisor. */
export const documentacionEnRevision = (d: Documentacion, actorId: string): Documentacion => ({
  ...d,
  incremento: {
    estatus: "En revisión",
    enviadoEn: new Date().toISOString(),
    enviadoPor: actorId,
  },
});

/** Documentación con el incremento validado técnicamente por el Revisor. */
export const documentacionValidada = (d: Documentacion, revisorId: string): Documentacion => ({
  ...d,
  incremento: {
    ...(d.incremento ?? { estatus: "En revisión" }),
    estatus: "Validado por Revisor",
    revisorId,
    revisadoEn: new Date().toISOString(),
  },
});

/** Documentación con el incremento devuelto al comisionado por el Revisor. */
export const documentacionDevuelta = (
  d: Documentacion,
  revisorId: string,
  observaciones: string,
): Documentacion => ({
  ...d,
  incremento: {
    ...(d.incremento ?? { estatus: "En captura" }),
    estatus: "En captura",
    revisorId,
    revisadoEn: new Date().toISOString(),
    observaciones,
  },
});

/** Documentación con el saldo marcado para reintegro. */
export const documentacionReintegro = (d: Documentacion, actorId: string): Documentacion => ({
  ...d,
  estatus: "Reintegro",
  incremento: undefined,
  reintegro: { fecha: new Date().toISOString(), monto: redondear(Number(d.monto) || 0), actorId },
});

const hoyFecha = () => new Date().toISOString().slice(0, 10);

/** La fecha compromiso venció y el saldo sigue abierto. */
export const esCandidatoReintegro = (g: Gasto) => {
  const d = documentacionAbierta(g);
  return Boolean(d && d.fechaCompromiso && d.fechaCompromiso < hoyFecha());
};

/** Días transcurridos desde la fecha compromiso (negativo si aún no vence). */
export function diasFrenteACompromiso(g: Gasto): number {
  const d = documentacionAbierta(g);
  if (!d?.fechaCompromiso) return 0;
  const limite = new Date(`${d.fechaCompromiso}T00:00:00`).getTime();
  return Math.floor((Date.now() - limite) / 86400000);
}

/** Viajeros cuya evidencia sigue incompleta, con el detalle de lo que falta. */
export function faltantesDe(g: Gasto): { participanteId: string; falta: string; importe: number }[] {
  return desgloseViajeros(g)
    .filter((v) => !v.completo)
    .map((v) => ({
      participanteId: v.participanteId,
      importe: v.importe,
      falta: !v.ida && !v.regreso ? "pase de ida y de regreso" : !v.ida ? "pase de ida" : "pase de regreso",
    }));
}

/** Documentación resultante tras cerrar el monto ya respaldado. */
export function documentacionCerrada(
  d: Documentacion,
  monto: number,
  actorId: string,
  nota?: string,
): Documentacion {
  const nuevoSaldo = Math.max(0, redondear(resta(Number(d.monto) || 0, monto)));
  return {
    ...d,
    monto: nuevoSaldo,
    estatus: nuevoSaldo > 0 ? "Abierto" : "Cerrado",
    cierres: [
      ...(d.cierres ?? []),
      { fecha: new Date().toISOString(), monto: redondear(monto), actorId, ...(nota ? { nota } : {}) },
    ],
  };
}
