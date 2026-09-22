/**
 * Catálogo de rubros con su modelo de comprobación. En lugar de comparar
 * nombres por todo el código, cada rubro se marca con el tipo de evidencia de
 * traslado que exige y si pide justificación escrita obligatoria.
 */

export type EvidenciaTraslado =
  /** Pase de abordar de ida y de regreso por cada viajero (Vuelos). */
  | "por_viajero"
  /** Evidencia de viaje del grupo: una de ida y una de vuelta. */
  | "grupo_redondo"
  /** Sin evidencia especial de traslado. */
  | "ninguna";

export const RUBRO_VUELOS = "Vuelos";
export const RUBRO_TERRESTRE = "Transporte Terrestre";
export const RUBRO_SEGURIDAD = "Seguridad y Salud";
export const RUBRO_OTROS = "Otros";

/** Nombre anterior del rubro de vuelos; se conserva por compatibilidad. */
export const RUBRO_TRANSPORTE_LEGADO = "Transporte";

export type MetaRubro = {
  evidencia: EvidenciaTraslado;
  /** Pide describir por escrito el concepto del gasto. */
  requiereJustificacion: boolean;
};

const SIN_MARCAS: MetaRubro = { evidencia: "ninguna", requiereJustificacion: false };

const META: Record<string, MetaRubro> = {
  [RUBRO_VUELOS]: { evidencia: "por_viajero", requiereJustificacion: false },
  [RUBRO_TRANSPORTE_LEGADO]: { evidencia: "por_viajero", requiereJustificacion: false },
  [RUBRO_TERRESTRE]: { evidencia: "grupo_redondo", requiereJustificacion: false },
  [RUBRO_SEGURIDAD]: SIN_MARCAS,
  [RUBRO_OTROS]: { evidencia: "ninguna", requiereJustificacion: true },
};

export const metaRubro = (rubro: string): MetaRubro => META[rubro] ?? SIN_MARCAS;

/** El rubro comprueba por viajero (pase de ida y de regreso de cada persona). */
export const rubroPorViajero = (rubro: string) => metaRubro(rubro).evidencia === "por_viajero";

/** El rubro comprueba con evidencia de viaje del grupo (ida y vuelta). */
export const rubroGrupoRedondo = (rubro: string) => metaRubro(rubro).evidencia === "grupo_redondo";

/** El rubro captura origen, destino y escalas. */
export const rubroConTraslado = (rubro: string) => metaRubro(rubro).evidencia !== "ninguna";

/** El rubro exige justificación escrita del concepto. */
export const rubroRequiereJustificacion = (rubro: string) => metaRubro(rubro).requiereJustificacion;
