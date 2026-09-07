import { supabase } from "@/integrations/supabase/client";
import type {
  Aceptacion,
  Archivo,
  Bitacora,
  Delegacion,
  Estado,
  Evento,
  Gasto,
  Participante,
  Presupuesto,
  Rol,
} from "./types";

export type Perfil = {
  id: string;
  nombre: string;
  email: string;
  estatus: string;
  rol: Rol | null;
};

export type DatosOperacion = Omit<Estado, "usuarios" | "usuarioActualId">;

type Fila = Record<string, unknown>;

/** Bucket privado donde vive la evidencia documental. */
export const BUCKET = "comprobantes";

/** Tamaño máximo por archivo (coincide con el límite del bucket). */
export const MAX_ARCHIVO_MB = 10;

// El cliente generado tipa cada tabla; estas mutaciones se arman en tiempo de
// ejecución, así que se usa una vista dinámica del mismo cliente.
type Resultado = { data: unknown; error: { message: string } | null };
type Respuesta = PromiseLike<Resultado>;
type Constructor = Respuesta & {
  select: (cols?: string) => Constructor;
  insert: (fila: Fila | Fila[]) => Constructor;
  update: (fila: Fila) => Constructor;
  delete: () => Constructor;
  eq: (col: string, valor: unknown) => Constructor;
  in: (col: string, valores: unknown[]) => Constructor;
  order: (col: string, opciones?: { ascending: boolean }) => Constructor;
  single: () => Respuesta;
  maybeSingle: () => Respuesta;
};
const sb = supabase as unknown as { from: (tabla: string) => Constructor };

async function ejecutar<T>(q: Respuesta, contexto: string): Promise<T> {
  const { data, error } = await q;
  if (error) throw new Error(`${contexto}: ${error.message}`);
  return data as T;
}

const uuidONull = (v: string | undefined) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : null);

/* ---------- Lectura ---------- */

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

export function aGasto(fila: Fila): Gasto {
  const g = fila as Record<string, any>;
  const base: Gasto = {
    id: g["id"],
    eventoId: g["evento_id"],
    rubro: g["rubro"],
    proveedor: g["proveedor"],
    monto: Number(g["monto"]),
    moneda: g["moneda"] as Gasto["moneda"],
    tipoCambio: Number(g["tipo_cambio"]),
    montoMXN: Number(g["monto_mxn"]),
    sinCFDI: Boolean(g["sin_cfdi"]),
    tipoComprobante: (g["tipo_comprobante"] ??
      (g["sin_cfdi"] ? "Sin comprobante fiscal" : "CFDI nacional")) as Gasto["tipoComprobante"],
    paisEmision: String(g["pais_emision"] ?? ""),
    justificacion: g["justificacion"] ?? "",
    origenPais: g["origen_pais"] ?? "",
    origenCiudad: g["origen_ciudad"] ?? "",
    destinoPais: g["destino_pais"] ?? "",
    destinoCiudad: g["destino_ciudad"] ?? "",
    escalas: (g["escalas"] as Gasto["escalas"]) ?? [],
    participantesIds: g["participantes_ids"] ?? [],
    viajeros: (g["viajeros"] as Gasto["viajeros"]) ?? [],
    archivos: (g["archivos"] as Archivo[]) ?? [],

    estatus: g["estatus"] as Gasto["estatus"],
    observaciones: g["observaciones"] ?? "",
    comisionadoId: g["comisionado_id"] ?? "",
    creadoEn: g["creado_en"],
  };
  if (g["revisor_id"]) base.revisorId = g["revisor_id"];
  if (g["dictaminador_id"]) base.dictaminadorId = g["dictaminador_id"];
  if (g["motivo_rechazo"]) base.motivoRechazo = g["motivo_rechazo"];
  if (g["folio_delegacion"]) base.folioDelegacion = g["folio_delegacion"];
  if (g["subtotal"] !== null && g["subtotal"] !== undefined) base.subtotal = Number(g["subtotal"]);
  if (g["iva"] !== null && g["iva"] !== undefined) base.iva = Number(g["iva"]);
  if (g["uuid_fiscal"]) base.uuidFiscal = String(g["uuid_fiscal"]);
  if (g["rfc_emisor"]) base.rfcEmisor = String(g["rfc_emisor"]);
  if (g["rfc_receptor"]) base.rfcReceptor = String(g["rfc_receptor"]);
  const ia = g["ia_extraccion"] as Gasto["iaExtraccion"] | undefined;
  if (ia && Object.keys(ia).length) base.iaExtraccion = ia;
  return base;
}

export function filaGasto(g: Gasto): Fila {
  return {
    id: g.id,
    evento_id: g.eventoId,
    rubro: g.rubro,
    proveedor: g.proveedor,
    monto: g.monto,
    moneda: g.moneda,
    tipo_cambio: g.tipoCambio,
    monto_mxn: g.montoMXN,
    sin_cfdi: g.tipoComprobante === "Sin comprobante fiscal",
    tipo_comprobante: g.tipoComprobante,
    pais_emision: g.paisEmision ?? "",
    justificacion: g.justificacion,
    origen_pais: g.origenPais ?? "",
    origen_ciudad: g.origenCiudad ?? "",
    destino_pais: g.destinoPais ?? "",
    destino_ciudad: g.destinoCiudad ?? "",
    escalas: g.escalas ?? [],
    participantes_ids: g.participantesIds,
    viajeros: g.viajeros ?? [],
    archivos: g.archivos,

    observaciones: g.observaciones,
    comisionado_id: uuidONull(g.comisionadoId),
    creado_en: g.creadoEn,
    revisor_id: uuidONull(g.revisorId),
    dictaminador_id: uuidONull(g.dictaminadorId),
    motivo_rechazo: g.motivoRechazo ?? null,
    folio_delegacion: g.folioDelegacion ?? null,
    ia_extraccion: g.iaExtraccion ?? {},
    subtotal: g.subtotal ?? null,
    iva: g.iva ?? null,
    uuid_fiscal: g.uuidFiscal ?? null,
    rfc_emisor: g.rfcEmisor ?? null,
    rfc_receptor: g.rfcReceptor ?? null,
  };
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
      supabase.from("bitacora").select("*").order("fecha", { ascending: false }).limit(500),
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
      estatus: ev.estatus as Evento["estatus"],
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
    gastos: (gastos.data ?? []).map((g) => aGasto(g as Fila)),
    delegaciones: (delegaciones.data ?? []).map((d) => ({
      folio: d.folio,
      deId: d.de_id ?? "",
      paraId: d.para_id ?? "",
      fechaInicio: d.fecha_inicio,
      fechaFin: d.fecha_fin,
      motivo: d.motivo,
      estatus: d.estatus as Delegacion["estatus"],
    })),
    bitacora: (bitacora.data ?? []).map((b) => ({
      id: b.id,
      fecha: b.fecha,
      actor: b.actor,
      actor_id: (b as { actor_id?: string | null }).actor_id ?? "",
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
    rfcAdemeba: String((config.data as { rfc_ademeba?: string } | null)?.rfc_ademeba ?? ""),
    versionReglas: config.data?.version_reglas ?? "ADEMEBA v1.0",
  };
}

/** Gastos que corresponden a los estatus indicados (consulta acotada por pantalla). */
export async function cargarGastosPorEstatus(estatuses: Gasto["estatus"][]): Promise<Gasto[]> {
  const { data, error } = await supabase
    .from("gastos")
    .select("*")
    .in("estatus", estatuses)
    .order("creado_en", { ascending: false });
  if (error) throw new Error(`No se pudieron leer los gastos: ${error.message}`);
  return (data ?? []).map((g) => aGasto(g as Fila));
}

/** Relee un gasto de la base (read-after-write). */
export async function leerGasto(id: string): Promise<Gasto> {
  const fila = await ejecutar<Fila>(
    sb.from("gastos").select("*").eq("id", id).single(),
    "No se pudo releer el gasto",
  );
  return aGasto(fila);
}

/* ---------- Archivos ---------- */

function dataUrlABlob(dataUrl: string): Blob {
  const [cabecera, contenido] = dataUrl.split(",");
  const tipo = /data:([^;]+)/.exec(cabecera ?? "")?.[1] ?? "application/octet-stream";
  if (!(cabecera ?? "").includes("base64")) {
    return new Blob([decodeURIComponent(contenido ?? "")], { type: tipo });
  }
  const binario = atob(contenido ?? "");
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

const nombreSeguro = (nombre: string) => nombre.replace(/[^\w.\-]+/g, "_").slice(-120);

/**
 * Sube la evidencia al bucket privado y devuelve el archivo con su ruta,
 * sin base64: el renglón del gasto solo guarda la referencia.
 */
export async function subirArchivo(gastoId: string, archivo: Archivo): Promise<Archivo> {
  if (archivo.ruta) {
    const { dataUrl: _omitido, ...resto } = archivo;
    return resto;
  }
  if (!archivo.dataUrl) throw new Error(`El archivo "${archivo.nombre}" no se pudo leer.`);
  const blob = dataUrlABlob(archivo.dataUrl);
  if (blob.size > MAX_ARCHIVO_MB * 1024 * 1024)
    throw new Error(`El archivo "${archivo.nombre}" excede ${MAX_ARCHIVO_MB} MB.`);
  const ruta = `${gastoId}/${Date.now()}-${nombreSeguro(archivo.nombre)}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, blob, { contentType: blob.type, upsert: false });
  if (error) throw new Error(`No se pudo subir "${archivo.nombre}": ${error.message}`);
  const { dataUrl: _sinBase64, ...resto } = archivo;
  return { ...resto, ruta };
}

export async function subirArchivos(gastoId: string, archivos: Archivo[]): Promise<Archivo[]> {
  const subidos: Archivo[] = [];
  for (const a of archivos) subidos.push(await subirArchivo(gastoId, a));
  return subidos;
}

export async function borrarArchivos(rutas: string[]): Promise<void> {
  if (rutas.length) await supabase.storage.from(BUCKET).remove(rutas);
}

/** URL firmada temporal para ver o descargar un documento del bucket privado. */
export async function urlFirmada(ruta: string, segundos = 300): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, segundos);
  if (error || !data?.signedUrl)
    throw new Error(`No se pudo generar el enlace del documento: ${error?.message ?? "sin URL"}`);
  return data.signedUrl;
}

/* ---------- Mutaciones por registro ---------- */

export async function insertarGasto(g: Gasto): Promise<Gasto> {
  const fila = await ejecutar<Fila>(
    sb.from("gastos").insert(filaGasto(g)).select("*").single(),
    "No se pudo guardar el gasto",
  );
  return leerGasto(aGasto(fila).id);
}

export async function actualizarGasto(id: string, campos: Fila): Promise<Gasto> {
  await ejecutar<Fila>(
    sb.from("gastos").update(campos).eq("id", id).select("*").single(),
    "No se pudo actualizar el gasto",
  );
  return leerGasto(id);
}

export async function borrarGasto(id: string): Promise<void> {
  await ejecutar(sb.from("gastos").delete().eq("id", id).select("id"), "No se pudo eliminar el gasto");
}

export async function insertarEvento(ev: Omit<Evento, "participantes">): Promise<Evento> {
  const fila = await ejecutar<Fila>(
    sb
      .from("eventos")
      .insert({
        id: ev.id,
        nombre: ev.nombre,
        sede: ev.sede,
        fecha_inicio: ev.fechaInicio || null,
        fecha_fin: ev.fechaFin || null,
        clave: ev.clave,
        estatus: ev.estatus,
      })
      .select("*")
      .single(),
    "No se pudo guardar el evento",
  );
  const f = fila as Record<string, any>;
  return {
    id: f["id"],
    nombre: f["nombre"],
    sede: f["sede"],
    fechaInicio: f["fecha_inicio"] ?? "",
    fechaFin: f["fecha_fin"] ?? "",
    clave: f["clave"],
    estatus: f["estatus"],
    participantes: [],
  };
}

export async function insertarParticipante(
  eventoId: string,
  p: Participante,
): Promise<Participante> {
  const fila = await ejecutar<Fila>(
    sb
      .from("participantes")
      .insert({ id: p.id, evento_id: eventoId, nombre: p.nombre, tipo: p.tipo })
      .select("*")
      .single(),
    "No se pudo guardar el participante",
  );
  const f = fila as Record<string, any>;
  return { id: f["id"], nombre: f["nombre"], tipo: f["tipo"] };
}

export async function insertarPresupuesto(p: Presupuesto): Promise<Presupuesto> {
  const fila = await ejecutar<Fila>(
    sb
      .from("presupuestos")
      .insert({
        id: p.id,
        evento_id: p.eventoId,
        rubro: p.rubro,
        monto: p.monto,
        responsable_id: uuidONull(p.responsableId),
      })
      .select("*")
      .single(),
    "No se pudo guardar el presupuesto",
  );
  const f = fila as Record<string, any>;
  return {
    id: f["id"],
    eventoId: f["evento_id"],
    rubro: f["rubro"],
    monto: Number(f["monto"]),
    responsableId: f["responsable_id"] ?? "",
  };
}

const aDelegacion = (f: Record<string, any>): Delegacion => ({
  folio: f["folio"],
  deId: f["de_id"] ?? "",
  paraId: f["para_id"] ?? "",
  fechaInicio: f["fecha_inicio"],
  fechaFin: f["fecha_fin"],
  motivo: f["motivo"],
  estatus: f["estatus"],
});

export async function insertarDelegacion(d: Delegacion): Promise<Delegacion> {
  const fila = await ejecutar<Fila>(
    sb
      .from("delegaciones")
      .insert({
        folio: d.folio,
        de_id: uuidONull(d.deId),
        para_id: uuidONull(d.paraId),
        fecha_inicio: d.fechaInicio,
        fecha_fin: d.fechaFin,
        motivo: d.motivo,
        estatus: d.estatus,
      })
      .select("*")
      .single(),
    "No se pudo guardar la delegación",
  );
  return aDelegacion(fila as Record<string, any>);
}

export async function actualizarDelegacion(folio: string, campos: Fila): Promise<Delegacion> {
  const fila = await ejecutar<Fila>(
    sb.from("delegaciones").update(campos).eq("folio", folio).select("*").single(),
    "No se pudo actualizar la delegación",
  );
  return aDelegacion(fila as Record<string, any>);
}

export async function insertarCatalogo(tipo: string, valor: string): Promise<string> {
  const fila = await ejecutar<Fila>(
    sb
      .from("catalogos")
      .insert({ id: `${tipo}:${valor}`, tipo, valor })
      .select("*")
      .single(),
    "No se pudo guardar el catálogo",
  );
  return String((fila as Record<string, any>)["valor"]);
}

export async function borrarCatalogo(tipo: string, valor: string): Promise<void> {
  await ejecutar(
    sb.from("catalogos").delete().eq("id", `${tipo}:${valor}`).select("id"),
    "No se pudo eliminar el catálogo",
  );
}

export type Configuracion = { topeSinComprobante: number; rfcAdemeba: string; versionReglas: string };

export async function actualizarConfiguracion(campos: Fila): Promise<Configuracion> {
  const fila = await ejecutar<Fila>(
    sb.from("configuracion").update(campos).eq("id", 1).select("*").single(),
    "No se pudo guardar la configuración",
  );
  const f = fila as Record<string, any>;
  return {
    topeSinComprobante: Number(f["tope_sin_comprobante"]),
    rfcAdemeba: String(f["rfc_ademeba"] ?? ""),
    versionReglas: String(f["version_reglas"] ?? "ADEMEBA v1.0"),
  };
}

export async function insertarAceptacion(a: Aceptacion): Promise<Aceptacion> {
  const fila = await ejecutar<Fila>(
    sb
      .from("aceptaciones")
      .insert({ id: a.id, usuario_id: a.usuarioId, fecha: a.fecha, version: a.version })
      .select("*")
      .single(),
    "No se pudo guardar la aceptación",
  );
  const f = fila as Record<string, any>;
  return { id: f["id"], usuarioId: f["usuario_id"], fecha: f["fecha"], version: f["version"] };
}

export async function insertarBitacora(b: Bitacora): Promise<Bitacora> {
  const fila = await ejecutar<Fila>(
    sb
      .from("bitacora")
      .insert({
        id: b.id,
        actor: b.actor,
        actor_id: uuidONull(b.actor_id),
        accion: b.accion,
        detalle: b.detalle,
      })
      .select("*")
      .single(),
    "No se pudo asentar la bitácora",
  );
  const f = fila as Record<string, any>;
  return {
    id: f["id"],
    fecha: f["fecha"],
    actor: f["actor"],
    actor_id: f["actor_id"] ?? "",
    accion: f["accion"],
    detalle: f["detalle"],
  };
}
