export type Rol = "Contralor" | "Revisor" | "Director" | "Comisionado";

export const ROLES: Rol[] = ["Contralor", "Revisor", "Director", "Comisionado"];

export type Usuario = {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
};

export type Participante = {
  id: string;
  nombre: string;
  tipo: "Jugador" | "Jugadora" | "Entrenador" | "Administrativo";
};

export type Evento = {
  id: string;
  nombre: string;
  sede: string;
  fechaInicio: string;
  fechaFin: string;
  clave: string;
  estatus: "Activo" | "Próximo" | "Cerrado";
  participantes: Participante[];
};

export type Presupuesto = {
  id: string;
  eventoId: string;
  rubro: string;
  monto: number;
  responsableId: string;
};

export type Archivo = {
  nombre: string;
  tipo: string;
  /** Ruta dentro del bucket privado de comprobantes: fuente de verdad del documento. */
  ruta?: string | undefined;
  /** Huella SHA-256 del contenido, para el candado antiduplicados. */
  hash?: string | undefined;
  /** Contenido en memoria mientras se sube; nunca se guarda en la base. */
  dataUrl?: string | undefined;
  /** Participante al que corresponde el pase de abordar, si aplica. */
  participanteId?: string | undefined;
  /** Tramo del pase de abordar. Los pases antiguos sin tramo cuentan como ida. */
  tramo?: "Ida" | "Regreso" | undefined;
};

/** Importe individual asignado a un viajero dentro de un gasto de Transporte. */
export type Viajero = { participanteId: string; importe: number };

/** Cómo se desembolsó el recurso del gasto ya comprobado. */
export const TIPOS_DESEMBOLSO = [
  "Pago directo al proveedor",
  "Reembolso al comisionado",
] as const;
export type TipoDesembolso = (typeof TIPOS_DESEMBOLSO)[number];

export const FORMAS_PAGO = ["Transferencia", "Cheque", "Tarjeta", "Otro"] as const;
export type FormaPago = (typeof FORMAS_PAGO)[number];

/** Un abono del desembolso: su evidencia bancaria, importe y, si aplica, su REP. */
export type AbonoPago = {
  archivo: Archivo;
  monto: number;
  /** CFDI con complemento de pago (solo cuando la factura es PPD). */
  rep?: Archivo | undefined;
};

/** Evidencia bancaria de que ADEMEBA desembolsó el recurso de un gasto. */
export type ComprobantePago = {
  tipoDesembolso: TipoDesembolso;
  formaPago: FormaPago;
  fecha: string;
  referencia: string;
  cuentaOrdenante: string;
  beneficiario: string;
  /** La factura del proveedor es PPD y requiere complemento de pago por abono. */
  esPPD: boolean;
  abonos: AbonoPago[];
};

export type Escala = { pais: string; ciudad: string };


/** Trazabilidad de la extracción inteligente: propuesta de IA vs. valor confirmado. */
export type IaExtraccion = {
  modelo: string;
  metodo: string;
  fecha: string;
  archivo: string;
  hash: string;
  confianza: Record<string, string>;
  propuesto: Record<string, string>;
  confirmado: Record<string, string>;
};


export type EstatusGasto =
  | "Borrador"
  | "Registrado"
  | "Validado por Revisor"
  | "Devuelto para corrección"
  | "Aprobado"
  | "Rechazado";

/** Régimen bajo el que se comprueba el gasto. */
export const TIPOS_COMPROBANTE = [
  "CFDI nacional",
  "Comprobante extranjero",
  "Sin comprobante fiscal",
] as const;

export type TipoComprobante = (typeof TIPOS_COMPROBANTE)[number];

export type Gasto = {
  id: string;
  eventoId: string;
  rubro: string;
  proveedor: string;
  monto: number;
  moneda: "MXN" | "USD" | "EUR";
  tipoCambio: number;
  montoMXN: number;
  /** Valor derivado: verdadero solo cuando el tipo es "Sin comprobante fiscal". */
  sinCFDI: boolean;
  tipoComprobante: TipoComprobante;
  /** País de emisión, obligatorio en comprobantes extranjeros. */
  paisEmision: string;
  justificacion: string;
  origenPais: string;
  origenCiudad: string;
  destinoPais: string;
  destinoCiudad: string;
  /** Escalas o paradas intermedias del traslado, en orden. */
  escalas: Escala[];
  participantesIds: string[];
  /** Reparto del total entre viajeros (solo rubro Transporte). */
  viajeros: Viajero[];
  archivos: Archivo[];

  estatus: EstatusGasto;
  observaciones: string;
  comisionadoId: string;
  creadoEn: string;
  revisorId?: string | undefined;
  dictaminadorId?: string | undefined;
  motivoRechazo?: string | undefined;
  folioDelegacion?: string | undefined;
  iaExtraccion?: IaExtraccion | undefined;
  /** Datos fiscales del CFDI. `monto` es siempre el Total pagado. */
  subtotal?: number | undefined;
  iva?: number | undefined;
  uuidFiscal?: string | undefined;
  rfcEmisor?: string | undefined;
  rfcReceptor?: string | undefined;

};

export type Delegacion = {
  folio: string;
  deId: string;
  paraId: string;
  fechaInicio: string;
  fechaFin: string;
  motivo: string;
  estatus: "Vigente" | "Cancelada";
};

export type Bitacora = {
  id: string;
  fecha: string;
  actor: string;
  actor_id: string;
  accion: string;
  detalle: string;
};

export type Aceptacion = {
  id: string;
  usuarioId: string;
  fecha: string;
  version: string;
};

export type Estado = {
  usuarios: Usuario[];
  eventos: Evento[];
  presupuestos: Presupuesto[];
  gastos: Gasto[];
  delegaciones: Delegacion[];
  bitacora: Bitacora[];
  aceptaciones: Aceptacion[];
  rubros: string[];
  motivosRechazo: string[];
  justificacionesSinCFDI: string[];
  proveedores: string[];
  topeSinComprobante: number;
  rfcAdemeba: string;
  versionReglas: string;
  usuarioActualId: string;
};
