import { useMemo, useState } from "react";
import { mxn, useStore } from "@/lib/store";
import { redondear, resta } from "@/lib/dinero";
import { actualizarGasto, borrarArchivos, subirArchivos, MAX_ARCHIVO_MB } from "@/lib/db";
import { huellaArchivo } from "@/lib/duplicados";
import { esGastoTransporte, repartoUniforme, sumaViajeros } from "@/lib/transporte";
import type { Archivo, Gasto, Viajero } from "@/lib/types";
import { ArchivoEnlace } from "@/components/archivo-enlace";
import { Aviso, Boton, Campo, Entrada, Etiqueta, Panel, TituloPanel } from "@/components/glass";

type Tramo = "Ida" | "Regreso";
type Pases = Record<string, { Ida?: Archivo | undefined; Regreso?: Archivo | undefined }>;

/** Un gasto solo se corrige mientras no haya sido dictaminado. */
export const puedeEditarComprobacion = (g: Gasto) =>
  esGastoTransporte(g) && (g.estatus === "Borrador" || g.estatus === "Devuelto para corrección");

const tramoDe = (a: Archivo): Tramo => (a.tramo === "Regreso" ? "Regreso" : "Ida");

function pasesIniciales(g: Gasto): Pases {
  const mapa: Pases = {};
  for (const a of g.archivos ?? []) {
    if (!a.participanteId) continue;
    const actual = mapa[a.participanteId] ?? {};
    mapa[a.participanteId] = { ...actual, [tramoDe(a)]: a };
  }
  return mapa;
}

/**
 * Reapertura del desglose por viajero de un gasto de Transporte: importes
 * individuales y pases de ida y regreso, con guardado por registro.
 */
export function EditarComprobacion({
  gasto,
  onCerrar,
  onGuardado,
}: {
  gasto: Gasto;
  onCerrar: () => void;
  onGuardado: (g: Gasto) => void;
}) {
  const { estado, registrar } = useStore();
  const nominales = estado.eventos.find((e) => e.id === gasto.eventoId)?.participantes ?? [];
  const nombreDe = (id: string) => nominales.find((p) => p.id === id)?.nombre ?? id;

  const ids = useMemo(() => {
    const asignados = (gasto.viajeros ?? []).map((v) => v.participanteId).filter(Boolean);
    return asignados.length ? asignados : gasto.participantesIds ?? [];
  }, [gasto]);

  const base = useMemo(() => {
    const asignados = (gasto.viajeros ?? []).filter((v) => v.participanteId);
    return asignados.length ? asignados : repartoUniforme(gasto.montoMXN, ids);
  }, [gasto, ids]);

  const [importes, setImportes] = useState<Record<string, string>>(() =>
    Object.fromEntries(ids.map((id) => [id, String(base.find((v) => v.participanteId === id)?.importe ?? 0)])),
  );
  const [pases, setPases] = useState<Pases>(() => pasesIniciales(gasto));
  const [quitados, setQuitados] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const viajeros: Viajero[] = ids.map((id) => ({
    participanteId: id,
    importe: Number(importes[id]) || 0,
  }));
  const suma = sumaViajeros(viajeros);
  const diferencia = redondear(resta(gasto.montoMXN, suma));

  async function leerArchivo(file: File): Promise<Archivo> {
    const leido = await new Promise<Archivo>((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({ nombre: file.name, tipo: file.type || "archivo", dataUrl: String(reader.result) });
      reader.onerror = () => resolve({ nombre: file.name, tipo: file.type || "archivo", dataUrl: "" });
      reader.readAsDataURL(file);
    });
    return { ...leido, hash: await huellaArchivo(leido) };
  }

  async function cargarPase(id: string, tramo: Tramo, lista: FileList | null) {
    const file = lista?.[0];
    if (!file) return;
    if (file.size > MAX_ARCHIVO_MB * 1024 * 1024) {
      setError(`El archivo "${file.name}" excede ${MAX_ARCHIVO_MB} MB.`);
      return;
    }
    const anterior = pases[id]?.[tramo];
    if (anterior?.ruta) setQuitados((prev) => [...prev, anterior.ruta as string]);
    const leido = await leerArchivo(file);
    setError("");
    setPases((prev) => ({
      ...prev,
      [id]: { ...prev[id], [tramo]: { ...leido, participanteId: id, tramo } },
    }));
  }

  function quitarPase(id: string, tramo: Tramo) {
    const actual = pases[id]?.[tramo];
    if (actual?.ruta) setQuitados((prev) => [...prev, actual.ruta as string]);
    setPases((prev) => ({ ...prev, [id]: { ...prev[id], [tramo]: undefined } }));
  }

  async function guardar() {
    if (!puedeEditarComprobacion(gasto)) {
      setError(
        `El gasto de "${gasto.proveedor}" está en estatus ${gasto.estatus} y su comprobación ya no puede editarse.`,
      );
      return;
    }
    if (ids.some((id) => !(Number(importes[id]) >= 0))) {
      setError("Captura un importe válido para cada viajero.");
      return;
    }
    if (Math.abs(diferencia) > 0.01) {
      setError(
        `La suma de los importes por viajero (${mxn(suma)}) no cuadra con el total del gasto (${mxn(gasto.montoMXN)}). Diferencia: ${mxn(diferencia)}.`,
      );
      return;
    }
    setGuardando(true);
    let subidos: string[] = [];
    try {
      const nuevos = ids.flatMap((id) =>
        (["Ida", "Regreso"] as Tramo[])
          .map((t) => pases[id]?.[t])
          .filter((a): a is Archivo => Boolean(a?.dataUrl)),
      );
      const archivosSubidos = await subirArchivos(gasto.id, nuevos);
      subidos = archivosSubidos.map((a) => a.ruta).filter((r): r is string => Boolean(r));
      const conservados = ids.flatMap((id) =>
        (["Ida", "Regreso"] as Tramo[])
          .map((t) => pases[id]?.[t])
          .filter((a): a is Archivo => Boolean(a) && !a?.dataUrl),
      );
      const otros = (gasto.archivos ?? []).filter((a) => !a.participanteId);
      const guardado = await actualizarGasto(gasto.id, {
        viajeros,
        archivos: [...otros, ...conservados, ...archivosSubidos],
      });
      await borrarArchivos(quitados);
      await registrar(
        "Corrección de comprobación",
        `Desglose por viajero actualizado en el gasto de ${guardado.proveedor} por ${mxn(guardado.montoMXN)}.`,
      );
      setError("");
      setGuardando(false);
      onGuardado(guardado);
    } catch (err: unknown) {
      await borrarArchivos(subidos);
      setGuardando(false);
      setError(
        `No se pudo guardar la comprobación en el servidor: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return (
    <Panel className="mt-2">
      <TituloPanel sub="Ajusta los importes por viajero y sube, reemplaza o quita los pases de ida y regreso.">
        Editar comprobación · {gasto.proveedor}
      </TituloPanel>
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {ids.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Este gasto no tiene viajeros seleccionados.
        </p>
      ) : (
        <ul className="grid gap-2">
          {ids.map((id) => {
            const ida = pases[id]?.Ida;
            const regreso = pases[id]?.Regreso;
            return (
              <li
                key={id}
                className="grid gap-2 rounded-md border-2 border-border-strong bg-glass-strong p-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm">{nombreDe(id)}</strong>
                  <Etiqueta tono={ida && regreso ? "ok" : "alerta"}>
                    {ida && regreso ? "Evidencia completa" : "Evidencia incompleta"}
                  </Etiqueta>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <Campo etiqueta="Importe individual (MXN)" id={`ec-imp-${gasto.id}-${id}`}>
                    <Entrada
                      id={`ec-imp-${gasto.id}-${id}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={importes[id] ?? ""}
                      onChange={(e) => setImportes((prev) => ({ ...prev, [id]: e.target.value }))}
                    />
                  </Campo>
                  {(["Ida", "Regreso"] as Tramo[]).map((tramo) => {
                    const actual = tramo === "Ida" ? ida : regreso;
                    return (
                      <Campo
                        key={tramo}
                        etiqueta={`Pase de abordar · ${tramo.toLowerCase()}`}
                        id={`ec-${tramo}-${gasto.id}-${id}`}
                      >
                        <input
                          id={`ec-${tramo}-${gasto.id}-${id}`}
                          type="file"
                          onChange={(e) => void cargarPase(id, tramo, e.target.files)}
                          className="w-full rounded-md border-2 border-border-strong bg-input px-3 py-2 text-sm"
                        />
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {actual ? (
                            <>
                              <ArchivoEnlace archivo={actual} />
                              <Boton
                                type="button"
                                variante="peligro"
                                onClick={() => quitarPase(id, tramo)}
                              >
                                Quitar
                              </Boton>
                            </>
                          ) : (
                            "Pendiente"
                          )}
                        </span>
                      </Campo>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-2 text-sm">
        Suma de importes individuales: <strong>{mxn(suma)}</strong> de{" "}
        <strong>{mxn(gasto.montoMXN)}</strong>
        {Math.abs(diferencia) > 0.01 ? (
          <span className="font-semibold text-warning"> · Diferencia por cuadrar: {mxn(diferencia)}</span>
        ) : (
          " · La suma cuadra con el total."
        )}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Boton type="button" onClick={() => void guardar()} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar comprobación"}
        </Boton>
        <Boton type="button" variante="neutro" onClick={onCerrar} disabled={guardando}>
          Cancelar
        </Boton>
      </div>
    </Panel>
  );
}
