import { supabase } from "@/integrations/supabase/client";
import type { Estado, Gasto, Participante, Rol } from "./types";

export type Perfil = {
  id: string;
  nombre: string;
  email: string;
  estatus: string;
  rol: Rol | null;
};

export type DatosOperacion = Omit<Estado, "usuarios" | "usuarioActualId">;

type Fila = Record<string, unknown>;

/** Perfiles y roles visibles para la sesión actual. */
export async function cargarPerfiles(): Promise<Perfil[]> {
  const [{ data: perfiles }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, nombre, email, estatus").order("creado_en"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  return (perfiles ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    email: p.email,
    estatus: p.estatus,
    rol: ((roles ?? []).find((r) => r.user_id === p.id)?.role as Rol | undefined) ?? null,
  }));
}

/** Toda la información de operación desde la base de datos. */
export async function cargarDatos(): Promise<DatosOperacion> {
  const [eventos, participantes, presupuestos, gastos, delegaciones, bitacora, aceptaciones, catalogos, config] =
    await Promise.all([
      supabase.from("eventos").select("*").order("fecha_inicio"),
      supabase.from("participantes").select("*"),
      supabase.from("presupuestos").select("*"),
      supabase.from("gastos").select("*").order("creado_en", { ascending: false }),
      supabase.from("delegaciones").select("*"),
      supabase.from("bitacora").select("*").order("fecha", { ascending: false }).limit(400),
      supabase.from("aceptaciones").select("*"),
      supabase.from("catalogos").select("*").order("valor"),
      supabase.from("configuracion").select("*").maybeSingle(),
    ]);

  const porTipo = (tipo: string) =>
    (catalogos.data ?? []).filter((c) => c.tipo === tipo).map((c) => c.valor);

  return {
    eventos: (eventos.data ?? []).map((ev) => ({
      id: ev.id,
      nombre: ev.nombre,
      sede: ev.sede,
      fechaInicio: ev.fecha_inicio ?? "",
      fechaFin: ev.fecha_fin ?? "",
      clave: ev.clave,
      estatus: ev.estatus as Estado["eventos"][number]["estatus"],
      participantes: (participantes.data ?? [])
        .filter((p) => p.evento_id === ev.id)
        .map((p) => ({ id: p.id, nombre: p.nombre, tipo: p.tipo as Participante["tipo"] })),
    })),
    presupuestos: (presupuestos.data ?? []).map((b) => ({
      id: b.id,
      eventoId: b.evento_id,
      rubro: b.rubro,
      monto: Number(b.monto),
      responsableId: b.responsable_id ?? "",
    })),
    gastos: (gastos.data ?? []).map((g) => {
      const base: Gasto = {
        id: g.id,
        eventoId: g.evento_id,
        rubro: g.rubro,
        proveedor: g.proveedor,
        monto: Number(g.monto),
        moneda: g.moneda as Gasto["moneda"],
        tipoCambio: Number(g.tipo_cambio),
        montoMXN: Number(g.monto_mxn),
        sinCFDI: g.sin_cfdi,
        justificacion: g.justificacion,
        origenPais: g.origen_pais ?? "",
        origenCiudad: g.origen_ciudad ?? "",
        destinoPais: g.destino_pais ?? "",
        destinoCiudad: g.destino_ciudad ?? "",
        participantesIds: g.participantes_ids ?? [],
        archivos: (g.archivos as Gasto["archivos"]) ?? [],
        estatus: g.estatus as Gasto["estatus"],
        observaciones: g.observaciones,
        comisionadoId: g.comisionado_id ?? "",
        creadoEn: g.creado_en,
      };
      if (g.revisor_id) base.revisorId = g.revisor_id;
      if (g.dictaminador_id) base.dictaminadorId = g.dictaminador_id;
      if (g.motivo_rechazo) base.motivoRechazo = g.motivo_rechazo;
      if (g.folio_delegacion) base.folioDelegacion = g.folio_delegacion;
      return base;
    }),
    delegaciones: (delegaciones.data ?? []).map((d) => ({
      folio: d.folio,
      deId: d.de_id ?? "",
      paraId: d.para_id ?? "",
      fechaInicio: d.fecha_inicio,
      fechaFin: d.fecha_fin,
      motivo: d.motivo,
      estatus: d.estatus as Estado["delegaciones"][number]["estatus"],
    })),
    bitacora: (bitacora.data ?? []).map((b) => ({
      id: b.id,
      fecha: b.fecha,
      actor: b.actor,
      accion: b.accion,
      detalle: b.detalle,
    })),
    aceptaciones: (aceptaciones.data ?? []).map((a) => ({
      id: a.id,
      usuarioId: a.usuario_id,
      fecha: a.fecha,
      version: a.version,
    })),
    rubros: porTipo("rubro"),
    motivosRechazo: porTipo("motivo"),
    justificacionesSinCFDI: porTipo("justificacion"),
    proveedores: porTipo("proveedor"),
    topeSinComprobante: Number(config.data?.tope_sin_comprobante ?? 2000),
    versionReglas: config.data?.version_reglas ?? "ADEMEBA v1.0",
  };
}

/* ---------- Sincronización incremental ---------- */

const uuidONull = (v: string) => (/^[0-9a-f-]{36}$/i.test(v) ? v : null);

type Tabla = { nombre: string; pk: string; filas: (e: Estado) => Fila[] };

const TABLAS: Tabla[] = [
  {
    nombre: "eventos",
    pk: "id",
    filas: (e) =>
      e.eventos.map((ev) => ({
        id: ev.id,
        nombre: ev.nombre,
        sede: ev.sede,
        fecha_inicio: ev.fechaInicio || null,
        fecha_fin: ev.fechaFin || null,
        clave: ev.clave,
        estatus: ev.estatus,
      })),
  },
  {
    nombre: "participantes",
    pk: "id",
    filas: (e) =>
      e.eventos.flatMap((ev) =>
        ev.participantes.map((p) => ({
          id: p.id,
          evento_id: ev.id,
          nombre: p.nombre,
          tipo: p.tipo,
        })),
      ),
  },
  {
    nombre: "presupuestos",
    pk: "id",
    filas: (e) =>
      e.presupuestos.map((b) => ({
        id: b.id,
        evento_id: b.eventoId,
        rubro: b.rubro,
        monto: b.monto,
        responsable_id: uuidONull(b.responsableId),
      })),
  },
  {
    nombre: "delegaciones",
    pk: "folio",
    filas: (e) =>
      e.delegaciones.map((d) => ({
        folio: d.folio,
        de_id: uuidONull(d.deId),
        para_id: uuidONull(d.paraId),
        fecha_inicio: d.fechaInicio,
        fecha_fin: d.fechaFin,
        motivo: d.motivo,
        estatus: d.estatus,
      })),
  },
  {
    nombre: "gastos",
    pk: "id",
    filas: (e) =>
      e.gastos.map((g) => ({
        id: g.id,
        evento_id: g.eventoId,
        rubro: g.rubro,
        proveedor: g.proveedor,
        monto: g.monto,
        moneda: g.moneda,
        tipo_cambio: g.tipoCambio,
        monto_mxn: g.montoMXN,
        sin_cfdi: g.sinCFDI,
        justificacion: g.justificacion,
        origen_pais: g.origenPais ?? "",
        origen_ciudad: g.origenCiudad ?? "",
        destino_pais: g.destinoPais ?? "",
        destino_ciudad: g.destinoCiudad ?? "",
        participantes_ids: g.participantesIds,
        archivos: g.archivos,
        estatus: g.estatus,
        observaciones: g.observaciones,
        comisionado_id: uuidONull(g.comisionadoId),
        creado_en: g.creadoEn,
        revisor_id: uuidONull(g.revisorId ?? ""),
        dictaminador_id: uuidONull(g.dictaminadorId ?? ""),
        motivo_rechazo: g.motivoRechazo ?? null,
        folio_delegacion: g.folioDelegacion ?? null,
      })),
  },
  {
    nombre: "bitacora",
    pk: "id",
    filas: (e) =>
      e.bitacora.map((b) => ({
        id: b.id,
        fecha: b.fecha,
        actor: b.actor,
        accion: b.accion,
        detalle: b.detalle,
      })),
  },
  {
    nombre: "aceptaciones",
    pk: "id",
    filas: (e) =>
      e.aceptaciones.map((a) => ({
        id: a.id,
        usuario_id: a.usuarioId,
        fecha: a.fecha,
        version: a.version,
      })),
  },
  {
    nombre: "catalogos",
    pk: "id",
    filas: (e) =>
      [
        ...e.rubros.map((v) => ["rubro", v] as const),
        ...e.motivosRechazo.map((v) => ["motivo", v] as const),
        ...e.justificacionesSinCFDI.map((v) => ["justificacion", v] as const),
        ...e.proveedores.map((v) => ["proveedor", v] as const),
      ].map(([tipo, valor]) => ({ id: `${tipo}:${valor}`, tipo, valor })),
  },
  {
    nombre: "configuracion",
    pk: "id",
    filas: (e) => [
      { id: 1, tope_sin_comprobante: e.topeSinComprobante, version_reglas: e.versionReglas },
    ],
  },
];

export type Instantanea = Record<string, Record<string, string>>;

// Cliente sin tipado estático: los nombres de tabla se resuelven en tiempo de ejecución.
type ClienteDinamico = {
  from: (tabla: string) => {
    upsert: (filas: Fila[], opciones: { onConflict: string }) => Promise<{ error: { message: string } | null }>;
    delete: () => { in: (col: string, ids: string[]) => Promise<{ error: { message: string } | null }> };
  };
};
const dinamico = supabase as unknown as ClienteDinamico;

export function instantanea(estado: Estado): Instantanea {
  const salida: Instantanea = {};
  for (const t of TABLAS) {
    const mapa: Record<string, string> = {};
    for (const fila of t.filas(estado)) mapa[String(fila[t.pk])] = JSON.stringify(fila);
    salida[t.nombre] = mapa;
  }
  return salida;
}

/** Escribe en la base solo lo que cambió respecto a la instantánea previa. */
export async function sincronizar(estado: Estado, previa: Instantanea): Promise<Instantanea> {
  const actual = instantanea(estado);
  const errores: string[] = [];

  for (const t of TABLAS) {
    const antes = previa[t.nombre] ?? {};
    const ahora = actual[t.nombre] ?? {};
    const cambiadas = Object.keys(ahora)
      .filter((id) => antes[id] !== ahora[id])
      .map((id) => JSON.parse(ahora[id] as string) as Fila);
    if (cambiadas.length) {
      const { error } = await dinamico.from(t.nombre).upsert(cambiadas, { onConflict: t.pk });
      if (error) errores.push(`${t.nombre}: ${error.message}`);
    }
  }

  for (const t of [...TABLAS].reverse()) {
    const antes = previa[t.nombre] ?? {};
    const ahora = actual[t.nombre] ?? {};
    const eliminadas = Object.keys(antes).filter((id) => !(id in ahora));
    if (eliminadas.length) {
      const { error } = await dinamico.from(t.nombre).delete().in(t.pk, eliminadas);
      if (error) errores.push(`${t.nombre}: ${error.message}`);
    }
  }

  if (errores.length) throw new Error(errores.join(" · "));
  return actual;
}
