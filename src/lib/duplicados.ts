import type { Archivo, Gasto } from "./types";

/** Huella SHA-256 del contenido del archivo (candado antiduplicados). */
export async function huellaTexto(texto: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "";
  }
}

export async function huellaArchivo(a: Archivo): Promise<string> {
  const base = a.dataUrl && a.dataUrl.length > 0 ? a.dataUrl : `${a.nombre}|${a.tipo}`;
  return huellaTexto(base);
}

export type Coincidencia = { gasto: Gasto; archivo: string };

/**
 * Índice de huellas de todos los documentos ya registrados en la comprobación.
 * Sirve como candado: un mismo documento no puede registrarse dos veces.
 */
export async function indiceDocumentos(gastos: Gasto[]): Promise<Map<string, Coincidencia>> {
  const indice = new Map<string, Coincidencia>();
  for (const g of gastos) {
    for (const a of g.archivos) {
      const h = await huellaArchivo(a);
      if (h && !indice.has(h)) indice.set(h, { gasto: g, archivo: a.nombre });
    }
  }
  return indice;
}

/** Devuelve el primer documento repetido: dentro de la propia carga o contra lo ya registrado. */
export async function buscarDuplicado(
  nuevos: Archivo[],
  gastos: Gasto[],
): Promise<{ archivo: string; coincidencia: Coincidencia | null } | null> {
  const indice = await indiceDocumentos(gastos);
  const vistos = new Set<string>();
  for (const a of nuevos) {
    const h = await huellaArchivo(a);
    if (!h) continue;
    const previo = indice.get(h);
    if (previo) return { archivo: a.nombre, coincidencia: previo };
    if (vistos.has(h)) return { archivo: a.nombre, coincidencia: null };
    vistos.add(h);
  }
  return null;
}

/** Gasto idéntico ya capturado (mismo evento, rubro, proveedor y monto). */
export function gastoRepetido(gastos: Gasto[], nuevo: Omit<Gasto, "id">): Gasto | undefined {
  return gastos.find(
    (g) =>
      g.eventoId === nuevo.eventoId &&
      g.rubro === nuevo.rubro &&
      g.proveedor.trim().toLowerCase() === nuevo.proveedor.trim().toLowerCase() &&
      Math.abs(g.montoMXN - nuevo.montoMXN) < 0.01,
  );
}
