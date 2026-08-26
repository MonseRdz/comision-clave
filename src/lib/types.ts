export type Rol = "Contralor" | "Revisor" | "Director" | "Comisionado";

export const ROLES: Rol[] = ["Contralor", "Revisor", "Director", "Comisionado"];

export type Usuario = {
  id: string;
  nombre: string;
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
  dataUrl: string;
};

export type EstatusGasto =
  | "Registrado"
  | "Validado por Revisor"
  | "Devuelto para corrección"
  | "Aprobado"
  | "Rechazado";

export type Gasto = {
  id: string;
  eventoId: string;
  rubro: string;
  proveedor: string;
  monto: number;
  moneda: "MXN" | "USD" | "EUR";
  tipoCambio: number;
  montoMXN: number;
  sinCFDI: boolean;
  justificacion: string;
  participantesIds: string[];
  archivos: Archivo[];
  estatus: EstatusGasto;
  observaciones: string;
  comisionadoId: string;
  creadoEn: string;
  revisorId?: string | undefined;
  dictaminadorId?: string | undefined;
  motivoRechazo?: string | undefined;
  folioDelegacion?: string | undefined;
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
  versionReglas: string;
  usuarioActualId: string;
};
