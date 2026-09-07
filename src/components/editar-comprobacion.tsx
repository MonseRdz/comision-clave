import { useMemo, useState } from "react";
import { mxn, useStore } from "@/lib/store";
import { convertirMoneda, redondear, resta } from "@/lib/dinero";
import { actualizarGasto, borrarArchivos, subirArchivos, MAX_ARCHIVO_MB } from "@/lib/db";
import { huellaArchivo } from "@/lib/duplicados";
import { esGastoTransporte, repartoUniforme, sumaViajeros } from "@/lib/transporte";
import type { Archivo, Gasto, TipoComprobante, Viajero } from "@/lib/types";
import { TIPOS_COMPROBANTE } from "@/lib/types";
import { ArchivoEnlace } from "@/components/archivo-enlace";
import { Aviso, Boton, Campo, Entrada, Etiqueta, Panel, Selector, TituloPanel } from "@/components/glass";

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
 * Editor completo de un gasto de Transporte en Borrador o Devuelto para
 * corrección: datos generales, factura y desglose por viajero con sus pases.
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

  const [datos, setDatos] = useState({
    rubro: gasto.rubro,
    proveedor: gasto.proveedor,
    monto: String(gasto.monto),
    moneda: gasto.moneda,
    tipoCambio: String(gasto.tipoCambio || 1),
    tipoComprobante: gasto.tipoComprobante,
  });
  const [importes, setImportes] = useState<Record<string, string>>(() =>
    Object.fromEntries(ids.map((id) => [id, String(base.find((v) => v.participanteId === id)?.importe ?? 0)])),
  );
  const [pases, setPases] = useState<Pases>(() => pasesIniciales(gasto));
  const [facturas, setFacturas] = useState<Archivo[]>(() =>
    (gasto.archivos ?? []).filter((a) => !a.participanteId),
  );
  const [quitados, setQuitados] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const monto = Number(datos.monto) || 0;
  const tc = datos.moneda === "MXN" ? 1 : Number(datos.tipoCambio) || 0;
  const montoMXN = convertirMoneda(monto, tc);

  const viajeros: Viajero[] = ids.map((id) => ({
    participanteId: id,
    importe: Number(importes[id]) || 0,
  }));
  const suma = sumaViajeros(viajeros);
  const diferencia = redondear(resta(montoMXN, suma));

  const rubros = estado.rubros.includes(datos.rubro) ? estado.rubros : [datos.rubro, ...estado.rubros];

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

  function excedeTamano(file: File) {
    if (file.size > MAX_ARCHIVO_MB * 1024 * 1024) {
      setError(`El archivo "${file.name}" excede ${MAX_ARCHIVO_MB} MB.`);
      return true;
    }
    return false;
  }

  async function cargarFacturas(lista: FileList | null) {
    const nuevos: Archivo[] = [];
    for (const file of Array.from(lista ?? [])) {
      if (excedeTamano(file)) return;
      nuevos.push(await leerArchivo(file));
    }
    if (!nuevos.length) return;
    setError("");
    setFacturas((prev) => [...prev, ...nuevos]);
  }

  function quitarFactura(indice: number) {
    const actual = facturas[indice];
    if (actual?.ruta) setQuitados((prev) => [...prev, actual.ruta as string]);
    setFacturas((prev) => prev.filter((_, i) => i !== indice));
  }

  async function cargarPase(id: string, tramo: Tramo, lista: FileList | null) {
    const file = lista?.[0];
    if (!file) return;
    if (excedeTamano(file)) return;
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
    if (!datos.proveedor.trim()) {
      setError("Captura el proveedor del gasto.");
      return;
    }
    if (!(monto > 0)) {
      setError("Captura un total mayor a cero.");
      return;
    }
    if (datos.moneda !== "MXN" && !(tc > 0)) {
      setError("Captura un tipo de cambio válido para la moneda extranjera.");
      return;
    }
    if (ids.some((id) => !(Number(importes[id]) >= 0))) {
      setError("Captura un importe válido para cada viajero.");
      return;
    }
    if (ids.length && Math.abs(diferencia) > 0.01) {
      setError(
        `La suma de los importes por viajero (${mxn(suma)}) no cuadra con el total del gasto (${mxn(montoMXN)}). Diferencia: ${mxn(diferencia)}.`,
      );
      return;
    }
    setGuardando(true);
    let subidos: string[] = [];
    try {
      const nuevos = [
        ...facturas.filter((a) => Boolean(a.dataUrl)),
        ...ids.flatMap((id) =>
          (["Ida", "Regreso"] as Tramo[])
            .map((t) => pases[id]?.[t])
            .filter((a): a is Archivo => Boolean(a?.dataUrl)),
        ),
      ];
      const archivosSubidos = await subirArchivos(gasto.id, nuevos);
      subidos = archivosSubidos.map((a) => a.ruta).filter((r): r is string => Boolean(r));
      const conservados = [
        ...facturas.filter((a) => !a.dataUrl),
        ...ids.flatMap((id) =>
          (["Ida", "Regreso"] as Tramo[])
            .map((t) => pases[id]?.[t])
            .filter((a): a is Archivo => Boolean(a) && !a?.dataUrl),
        ),
      ];
      const guardado = await actualizarGasto(gasto.id, {
        rubro: datos.rubro,
        proveedor: datos.proveedor.trim(),
        monto,
        moneda: datos.moneda,
        tipo_cambio: tc,
        monto_mxn: montoMXN,
        tipo_comprobante: datos.tipoComprobante,
        sin_cfdi: datos.tipoComprobante === "Sin comprobante fiscal",
        viajeros,
        archivos: [...conservados, ...archivosSubidos],
      });
      await borrarArchivos(quitados);
      await registrar(
        "Corrección de comprobación",
        `Gasto de ${guardado.proveedor} actualizado por ${mxn(guardado.montoMXN)}.`,
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
    <Panel>
      <TituloPanel sub="Corrige los datos generales, la factura y el desglose por viajero con sus pases de ida y regreso.">
        Editar comprobación · {gasto.proveedor}
      </TituloPanel>
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      <div className="grid gap-2 md:grid-cols-3">
        <Campo etiqueta="Rubro" id={`ec-rubro-${gasto.id}`}>
          <Selector
            id={`ec-rubro-${gasto.id}`}
            value={datos.rubro}
            onChange={(e) => setDatos((p) => ({ ...p, rubro: e.target.value }))}
          >
            {rubros.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Selector>
        </Campo>
        <Campo etiqueta="Proveedor" id={`ec-prov-${gasto.id}`}>
          <Entrada
            id={`ec-prov-${gasto.id}`}
            value={datos.proveedor}
            onChange={(e) => setDatos((p) => ({ ...p, proveedor: e.target.value }))}
          />
        </Campo>
        <Campo etiqueta="Régimen del comprobante" id={`ec-tipo-${gasto.id}`}>
          <Selector
            id={`ec-tipo-${gasto.id}`}
            value={datos.tipoComprobante}
            onChange={(e) =>
              setDatos((p) => ({ ...p, tipoComprobante: e.target.value as TipoComprobante }))
            }
          >
            {TIPOS_COMPROBANTE.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Selector>
        </Campo>
        <Campo etiqueta="Total del gasto" id={`ec-monto-${gasto.id}`}>
          <Entrada
            id={`ec-monto-${gasto.id}`}
            type="number"
            min={0}
            step="0.01"
            value={datos.monto}
            onChange={(e) => setDatos((p) => ({ ...p, monto: e.target.value }))}
          />
        </Campo>
        <Campo etiqueta="Moneda" id={`ec-moneda-${gasto.id}`}>
          <Selector
            id={`ec-moneda-${gasto.id}`}
            value={datos.moneda}
            onChange={(e) =>
              setDatos((p) => ({ ...p, moneda: e.target.value as Gasto["moneda"] }))
            }
          >
            {(["MXN", "USD", "EUR"] as Gasto["moneda"][]).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Selector>
        </Campo>
        <Campo etiqueta="Tipo de cambio" id={`ec-tc-${gasto.id}`}>
          <Entrada
            id={`ec-tc-${gasto.id}`}
            type="number"
            min={0}
            step="0.000001"
            disabled={datos.moneda === "MXN"}
            value={datos.moneda === "MXN" ? "1" : datos.tipoCambio}
            onChange={(e) => setDatos((p) => ({ ...p, tipoCambio: e.target.value }))}
          />
        </Campo>
      </div>
      <p className="mt-2 text-sm">
        Total en pesos: <strong>{mxn(montoMXN)}</strong>
      </p>

      <div className="mt-3 rounded-md border-2 border-border-strong bg-glass-strong p-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong className="text-sm">Factura o comprobante del total</strong>
          <Etiqueta tono={facturas.length ? "ok" : "alerta"}>
            {facturas.length ? `${facturas.length} documento(s)` : "Sin documento"}
          </Etiqueta>
        </div>
        <ul className="mt-2 grid gap-1 text-xs">
          {facturas.map((a, i) => (
            <li key={`${a.nombre}-${i}`} className="flex flex-wrap items-center gap-2">
              <ArchivoEnlace archivo={a} />
              <Boton type="button" variante="peligro" onClick={() => quitarFactura(i)}>
                Quitar
              </Boton>
            </li>
          ))}
          {facturas.length ? null : <li className="text-muted-foreground">Pendiente</li>}
        </ul>
        <Campo etiqueta="Agregar documento" id={`ec-fact-${gasto.id}`}>
          <input
            id={`ec-fact-${gasto.id}`}
            type="file"
            multiple
            onChange={(e) => void cargarFacturas(e.target.files)}
            className="w-full rounded-md border-2 border-border-strong bg-input px-3 py-2 text-sm"
          />
        </Campo>
      </div>

      {ids.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Este gasto no tiene viajeros seleccionados.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">
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
        <strong>{mxn(montoMXN)}</strong>
        {Math.abs(diferencia) > 0.01 ? (
          <span className="font-semibold text-warning"> · Diferencia por cuadrar: {mxn(diferencia)}</span>
        ) : (
          " · La suma cuadra con el total."
        )}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Boton type="button" onClick={() => void guardar()} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar cambios"}
        </Boton>
        <Boton type="button" variante="neutro" onClick={onCerrar} disabled={guardando}>
          Cancelar
        </Boton>
      </div>
    </Panel>
  );
}
