import { useState } from "react";
import { mxn, useStore } from "@/lib/store";
import { actualizarGasto, borrarArchivos, subirArchivos, MAX_ARCHIVO_MB } from "@/lib/db";
import { huellaArchivo } from "@/lib/duplicados";
import { desgloseViajeros } from "@/lib/transporte";
import {
  documentacionAbierta,
  documentacionEnRevision,
  esperaRevisionIncremento,
  faltantesDe,
  incrementoDe,
  incrementoValidado,
  montoPorCerrar,
  saldoEnDocumentacion,
} from "@/lib/documentacion";
import type { Archivo, Gasto } from "@/lib/types";
import { ArchivoEnlace } from "@/components/archivo-enlace";
import { Aviso, Boton, Campo, Etiqueta, Panel, TituloPanel } from "@/components/glass";

type Tramo = "Ida" | "Regreso";

/**
 * Carga de la evidencia que faltaba sobre un gasto YA APROBADO con saldo en
 * documentación. Solo quedan abiertos los espacios de los viajeros pendientes:
 * importes, montos y el resto del dictamen permanecen bloqueados.
 */
export function CompletarEvidencia({
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
  const doc = documentacionAbierta(gasto);
  const filas = desgloseViajeros(gasto);
  const pendientes = faltantesDe(gasto);

  const [nuevos, setNuevos] = useState<Record<string, Archivo>>({});
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function cargar(id: string, tramo: Tramo, lista: FileList | null) {
    const file = lista?.[0];
    if (!file) return;
    if (file.size > MAX_ARCHIVO_MB * 1024 * 1024)
      return setError(`El archivo "${file.name}" excede ${MAX_ARCHIVO_MB} MB.`);
    const leido = await new Promise<Archivo>((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({ nombre: file.name, tipo: file.type || "archivo", dataUrl: String(reader.result) });
      reader.onerror = () => resolve({ nombre: file.name, tipo: file.type || "archivo", dataUrl: "" });
      reader.readAsDataURL(file);
    });
    const conHuella: Archivo = {
      ...leido,
      hash: await huellaArchivo(leido),
      participanteId: id,
      tramo,
    };
    setError("");
    setNuevos((p) => ({ ...p, [`${id}|${tramo}`]: conHuella }));
  }

  async function guardar() {
    const lista = Object.values(nuevos);
    if (!lista.length) return setError("Adjunta al menos un pase faltante.");
    setGuardando(true);
    let subidos: string[] = [];
    try {
      const archivosSubidos = await subirArchivos(gasto.id, lista);
      subidos = archivosSubidos.map((a) => a.ruta).filter((r): r is string => Boolean(r));
      const guardado = await actualizarGasto(gasto.id, {
        archivos: [...(gasto.archivos ?? []), ...archivosSubidos],
      });
      await registrar(
        "Evidencia del saldo en documentación",
        `Gasto de ${gasto.proveedor}: se cargaron ${lista.length} pase(s) faltante(s) sobre el saldo en documentación de ${mxn(saldoEnDocumentacion(gasto))}.`,
      );
      setGuardando(false);
      setNuevos({});
      onGuardado(guardado);
    } catch (err: unknown) {
      await borrarArchivos(subidos);
      setGuardando(false);
      setError(
        `No se pudo guardar la evidencia: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** El incremento entra al mismo circuito: primero el Revisor, luego el Contralor. */
  async function enviarIncremento() {
    if (!doc) return;
    if (montoPorCerrar(gasto) <= 0)
      return setError("Aún no hay evidencia nueva que respalde un incremento.");
    setGuardando(true);
    try {
      const guardado = await actualizarGasto(gasto.id, {
        documentacion: documentacionEnRevision(doc, gasto.comisionadoId),
      });
      await registrar(
        "Incremento enviado a revisión",
        `Gasto de ${gasto.proveedor}: se envió a validación técnica un incremento de ${mxn(montoPorCerrar(gasto))} sobre el saldo en documentación de ${mxn(saldoEnDocumentacion(gasto))}.`,
      );
      setGuardando(false);
      onGuardado(guardado);
    } catch (err: unknown) {
      setGuardando(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const incremento = incrementoDe(gasto);
  const porCerrar = montoPorCerrar(gasto);

  return (
    <Panel>
      <TituloPanel sub="El gasto ya fue aprobado y es inmutable: solo puedes agregar los pases que faltaban. Importes y datos del gasto están bloqueados.">
        Completar evidencia · {gasto.proveedor}
      </TituloPanel>
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <Aviso tono="alerta">
        Saldo en documentación: <strong>{mxn(saldoEnDocumentacion(gasto))}</strong>
        {doc?.fechaCompromiso ? ` · fecha compromiso ${doc.fechaCompromiso}` : ""}. Cuando completes
        la evidencia, envía el incremento a revisión: lo valida el Revisor y después lo aprueba el
        Contralor.
      </Aviso>
      {incremento?.observaciones && incremento.estatus === "En captura" ? (
        <Aviso tono="error">
          El Revisor devolvió el incremento: {incremento.observaciones}
        </Aviso>
      ) : null}
      {esperaRevisionIncremento(gasto) ? (
        <Aviso>El incremento está con el Revisor, en validación técnica.</Aviso>
      ) : null}
      {incrementoValidado(gasto) ? (
        <Aviso>El Revisor validó el incremento; espera la aprobación del Contralor.</Aviso>
      ) : null}

      {pendientes.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          La evidencia está completa. Envía el incremento a revisión.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {filas
            .filter((v) => !v.completo)
            .map((v) => (
              <li
                key={v.participanteId}
                className="grid gap-2 rounded-md border-2 border-border-strong bg-glass-strong p-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm">{nombreDe(v.participanteId)}</strong>
                  <Etiqueta tono="alerta">Pendiente {mxn(v.pendiente)}</Etiqueta>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {(["Ida", "Regreso"] as Tramo[])
                    .filter((t) => (t === "Ida" ? !v.ida : !v.regreso))
                    .map((tramo) => {
                      const adjunto = nuevos[`${v.participanteId}|${tramo}`];
                      return (
                        <Campo
                          key={tramo}
                          etiqueta={`Pase de abordar · ${tramo.toLowerCase()}`}
                          id={`ce-${gasto.id}-${v.participanteId}-${tramo}`}
                        >
                          <input
                            id={`ce-${gasto.id}-${v.participanteId}-${tramo}`}
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => void cargar(v.participanteId, tramo, e.target.files)}
                            className="w-full rounded-md border-2 border-border-strong bg-input px-3 py-2 text-sm"
                          />
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {adjunto ? adjunto.nombre : "Pendiente"}
                          </span>
                        </Campo>
                      );
                    })}
                </div>
              </li>
            ))}
        </ul>
      )}

      <div className="mt-3">
        <p className="text-sm font-semibold">Evidencia ya cargada</p>
        <ul className="mt-1 grid gap-1 text-xs">
          {(gasto.archivos ?? []).map((a, i) => (
            <li key={`${a.nombre}-${i}`}>
              <ArchivoEnlace archivo={a} />
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Boton type="button" onClick={() => void guardar()} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar evidencia"}
        </Boton>
        <Boton type="button" variante="neutro" onClick={onCerrar} disabled={guardando}>
          Cerrar
        </Boton>
      </div>
    </Panel>
  );
}
