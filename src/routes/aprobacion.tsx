import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { useStore, mxn, fechaCorta } from "@/lib/store";
import { actualizarGasto, actualizarDelegacion, insertarDelegacion } from "@/lib/db";
import { baseConciliacion, pagoConciliado, sumaAbonos } from "@/lib/pago";
import {
  documentacionAbierta,
  documentacionCerrada,
  esCandidatoReintegro,
  faltantesDe,
  montoPorCerrar,
  saldoSinEvidencia,
  tieneSaldoEnDocumentacion,
} from "@/lib/documentacion";
import { ComprobantePagoGasto } from "@/components/comprobante-pago";
import type { Documentacion, Gasto } from "@/lib/types";
import {
  Panel,
  TituloPanel,
  Boton,
  Campo,
  Entrada,
  Selector,
  Aviso,
  Etiqueta,
  Tabla,
  Celda,
} from "@/components/glass";

export const Route = createFileRoute("/aprobacion")({
  head: () => ({
    meta: [
      { title: "Aprobación definitiva | Tresora Comprobación" },
      {
        name: "description",
        content: "Consola del Contralor para aprobar o rechazar gastos y delegar facultades.",
      },
      { property: "og:title", content: "Aprobación definitiva | Tresora Comprobación" },
      {
        property: "og:description",
        content: "Dictamen final inmutable y gestión de delegaciones de autoridad.",
      },
    ],
  }),
  component: Aprobacion,
});

function Aprobacion() {
  const { estado, setEstado, aplicarGasto, registrar, usuarioActual, puedeAprobar, delegacionVigente } =
    useStore();
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [saldos, setSaldos] = useState<Record<string, { responsableId: string; fecha: string }>>({});
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const [d, setD] = useState({
    paraId: estado.usuarios.find((u) => u.rol === "Director")?.id ?? "",
    fechaInicio: "",
    fechaFin: "",
    motivo: "",
  });

  const esContralor = usuarioActual.rol === "Contralor";
  const porAprobar = estado.gastos.filter((g) => g.estatus === "Validado por Revisor");
  const conPagoPendiente = estado.gastos.filter((g) => g.estatus === "Aprobado" && g.pagoPendiente);
  const enDocumentacion = estado.gastos.filter(tieneSaldoEnDocumentacion);
  const nombreDe = (id: string) => estado.usuarios.find((u) => u.id === id)?.nombre ?? "—";
  const nominalDe = (g: Gasto, id: string) =>
    estado.eventos.find((e) => e.id === g.eventoId)?.participantes.find((p) => p.id === id)?.nombre ?? id;
  const saldoForm = (g: Gasto) =>
    saldos[g.id] ?? { responsableId: g.comisionadoId, fecha: "" };

  /** Aprueba en firme la parte comprobable y manda el resto a documentación. */
  async function aprobarConSaldo(g: Gasto) {
    const form = saldoForm(g);
    const saldo = saldoSinEvidencia(g);
    if (saldo <= 0) return setError("Este gasto no tiene saldo pendiente por comprobar.");
    if (!form.responsableId) return setError("Selecciona a quién se le asigna el saldo en documentación.");
    if (!form.fecha) return setError("Captura la fecha compromiso del saldo en documentación.");
    const doc: Documentacion = {
      estatus: "Abierto",
      monto: saldo,
      montoInicial: saldo,
      responsableId: form.responsableId,
      fechaCompromiso: form.fecha,
      creadoEn: new Date().toISOString(),
      creadoPor: usuarioActual.id,
      cierres: [],
    };
    await dictaminar(g, "Aprobado", undefined, !pagoConciliado(g), doc);
  }

  /** Cierre directo del Contralor: baja el saldo por lo ya respaldado con evidencia. */
  async function cerrarSaldo(g: Gasto) {
    const d0 = documentacionAbierta(g);
    if (!d0) return;
    const monto = montoPorCerrar(g);
    if (monto <= 0)
      return setError(
        "Aún no llega evidencia nueva que respalde el saldo. Carga los pases faltantes antes de cerrar.",
      );
    try {
      const nueva = documentacionCerrada(d0, monto, usuarioActual.id);
      const guardado = await actualizarGasto(g.id, { documentacion: nueva });
      aplicarGasto(guardado);
      const texto = `Gasto de ${g.proveedor}: el Contralor cerró ${mxn(monto)} del saldo en documentación. Saldo restante: ${mxn(nueva.monto)}.`;
      await registrar("Cierre de saldo en documentación", texto);
      setError("");
      setAviso(texto);
    } catch (err: unknown) {
      setAviso("");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function dictaminar(
    g: Gasto,
    estatus: "Aprobado" | "Rechazado",
    motivo?: string,
    sinPago?: boolean,
    documentacion?: Documentacion,
  ) {
    const folio = usuarioActual.rol === "Director" ? delegacionVigente?.folio : undefined;
    const nota =
      estatus === "Aprobado"
        ? sinPago
          ? " — aprobado con pago pendiente: trazabilidad incompleta hasta cargar el comprobante de pago"
          : ` — con comprobante de pago por ${mxn(sumaAbonos(g.pago))} (${g.pago?.tipoDesembolso ?? ""})`
        : "";
    const texto = `Gasto de ${g.proveedor} por ${mxn(g.montoMXN)} ${estatus.toLowerCase()} por ${usuarioActual.nombre}${
      folio ? ` (delegación ${folio})` : ""
    }${motivo ? ` — motivo: ${motivo}` : ""}${nota}${
      documentacion
        ? ` — aprobación parcial: ${mxn(documentacion.monto)} pasan a documentación, asignados a ${nombreDe(documentacion.responsableId)} con fecha compromiso ${documentacion.fechaCompromiso}`
        : ""
    }.`;
    try {
      const guardado = await actualizarGasto(g.id, {
        estatus,
        dictaminador_id: usuarioActual.id,
        motivo_rechazo: estatus === "Rechazado" ? (motivo ?? null) : null,
        folio_delegacion: folio ?? null,
        pago_pendiente: estatus === "Aprobado" ? Boolean(sinPago) : false,
        ...(documentacion ? { documentacion } : {}),
      });
      aplicarGasto(guardado);
      await registrar(
        documentacion
          ? "Saldo enviado a documentación"
          : sinPago
            ? "Aprobación con pago pendiente"
            : "Dictamen definitivo",
        texto,
      );
      setError("");
      setAviso(texto);
    } catch (err: unknown) {
      setAviso("");
      setError(err instanceof Error ? err.message : String(err));
    }
  }


  async function crearDelegacion(ev: React.FormEvent) {
    ev.preventDefault();
    if (!d.paraId || !d.fechaInicio || !d.fechaFin || !d.motivo.trim())
      return setAviso("Completa destinatario, fechas y motivo de la delegación.");
    const folio = `DEL-${String(estado.delegaciones.length + 1).padStart(3, "0")}`;
    const para = estado.usuarios.find((u) => u.id === d.paraId);
    try {
      const guardada = await insertarDelegacion({
        folio,
        deId: usuarioActual.id,
        ...d,
        motivo: d.motivo.trim(),
        estatus: "Vigente",
      });
      setEstado((e) => ({ ...e, delegaciones: [...e.delegaciones, guardada] }));
      await registrar(
        "Delegación de autoridad",
        `Folio ${folio}: facultades delegadas a ${para?.nombre} del ${d.fechaInicio} al ${d.fechaFin} por "${guardada.motivo}".`,
      );
      setError("");
      setAviso(`Delegación ${folio} creada hacia ${para?.nombre} (${d.fechaInicio} a ${d.fechaFin}).`);
      setD({ ...d, fechaInicio: "", fechaFin: "", motivo: "" });
    } catch (err: unknown) {
      setAviso("");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function cancelarDelegacion(folio: string) {
    try {
      const guardada = await actualizarDelegacion(folio, { estatus: "Cancelada" });
      setEstado((e) => ({
        ...e,
        delegaciones: e.delegaciones.map((y) => (y.folio === folio ? guardada : y)),
      }));
      await registrar("Delegación cancelada", `Se canceló la delegación ${folio}.`);
      setError("");
      setAviso(`Delegación ${folio} cancelada.`);
    } catch (err: unknown) {
      setAviso("");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="grid gap-4 pt-4">
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {aviso ? <Aviso>{aviso}</Aviso> : null}

      {delegacionVigente ? (
        <Aviso tono="alerta">
          Delegación activa {delegacionVigente.folio}:{" "}
          {estado.usuarios.find((u) => u.id === delegacionVigente.deId)?.nombre} →{" "}
          {estado.usuarios.find((u) => u.id === delegacionVigente.paraId)?.nombre} (
          {delegacionVigente.fechaInicio} a {delegacionVigente.fechaFin}).
        </Aviso>
      ) : null}

      <Panel>
        <TituloPanel sub="Aprobación final o rechazo con catálogo de motivos. Una vez dictaminado, el gasto es inmutable.">
          Consola de aprobación definitiva
        </TituloPanel>
        {!puedeAprobar ? (
          <Aviso tono="alerta">
            Tu rol no tiene facultades de aprobación vigentes. El Director solo aprueba durante una
            delegación activa a su nombre.
          </Aviso>
        ) : null}
        <Tabla cabeceras={["Gasto", "Monto", "Revisor", "Estatus", "Dictamen"]}>
          {porAprobar.map((g) => (
            <Fragment key={g.id}>
            <tr>
              <Celda>
                <strong>{g.proveedor}</strong>
                <p className="text-xs text-muted-foreground">
                  {estado.eventos.find((e) => e.id === g.eventoId)?.nombre} · {g.rubro} ·{" "}
                  {fechaCorta(g.creadoEn)}
                </p>
              </Celda>
              <Celda>{mxn(g.montoMXN)}</Celda>
              <Celda>{estado.usuarios.find((u) => u.id === g.revisorId)?.nombre ?? "—"}</Celda>
              <Celda>
                <Etiqueta>{g.estatus}</Etiqueta>
              </Celda>
              <Celda>
                {puedeAprobar ? (
                  <div className="flex flex-wrap items-end gap-2">
                    {pagoConciliado(g) ? (
                      <Boton variante="exito" onClick={() => dictaminar(g, "Aprobado")}>
                        Aprobar definitivamente
                      </Boton>
                    ) : (
                      <div className="grid gap-1">
                        <Boton
                          variante="exito"
                          onClick={() => {
                            if (
                              window.confirm(
                                `El desembolso aún no está comprobado o no concilia con ${mxn(baseConciliacion(g))}. ¿Aprobar con pago pendiente? El gasto quedará marcado con trazabilidad incompleta hasta cargar el comprobante de pago.`,
                              )
                            )
                              void dictaminar(g, "Aprobado", undefined, true);
                          }}
                        >
                          Aprobar con pago pendiente
                        </Boton>
                        <span className="text-xs text-muted-foreground">
                          Para aprobar en firme, carga abajo el comprobante de pago conciliado.
                        </span>
                      </div>
                    )}
                    <Campo etiqueta="Motivo de rechazo" id={`mot-${g.id}`}>
                      <Selector
                        id={`mot-${g.id}`}
                        value={motivos[g.id] ?? ""}
                        onChange={(e) => setMotivos({ ...motivos, [g.id]: e.target.value })}
                      >
                        <option value="">Selecciona un motivo…</option>
                        {estado.motivosRechazo.map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </Selector>
                    </Campo>
                    <Boton
                      variante="peligro"
                      onClick={() => {
                        const m = motivos[g.id];
                        if (!m) return setAviso("Selecciona un motivo del catálogo para rechazar.");
                        dictaminar(g, "Rechazado", m);
                      }}
                    >
                      Rechazar
                    </Boton>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Sin facultades</span>
                )}
              </Celda>
            </tr>
            {puedeAprobar ? (
              <tr>
                <td colSpan={5} className="px-3 pb-4">
                  <ComprobantePagoGasto
                    gasto={g}
                    nombreComisionado={nombreDe(g.comisionadoId)}
                    onGuardado={aplicarGasto}
                    registrar={registrar}
                  />
                </td>
              </tr>
            ) : null}
            </Fragment>
          ))}

        </Tabla>
        {porAprobar.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No hay gastos validados en espera de aprobación.</p>
        ) : null}
      </Panel>

      {puedeAprobar && conPagoPendiente.length ? (
        <Panel>
          <TituloPanel sub="Gastos aprobados sin evidencia bancaria del desembolso. Carga el comprobante para completar la trazabilidad.">
            Aprobados con pago pendiente ({conPagoPendiente.length})
          </TituloPanel>
          <div className="grid gap-3">
            {conPagoPendiente.map((g) => (
              <div key={g.id}>
                <p className="text-sm font-semibold">
                  {g.proveedor} · {g.rubro} · {mxn(g.montoMXN)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {estado.eventos.find((e) => e.id === g.eventoId)?.nombre} · comisionado{" "}
                  {nombreDe(g.comisionadoId)}
                </p>
                <ComprobantePagoGasto
                  gasto={g}
                  nombreComisionado={nombreDe(g.comisionadoId)}
                  onGuardado={aplicarGasto}
                  registrar={registrar}
                />
              </div>
            ))}
          </div>
        </Panel>
      ) : null}



      <Panel>
        <TituloPanel sub="El Contralor delega facultades con vigencia y folio único.">
          Delegación de autoridad
        </TituloPanel>
        {esContralor ? (
          <form onSubmit={crearDelegacion} className="grid gap-3 md:grid-cols-4 md:items-end">
            <Campo etiqueta="Delegar a" id="d-para">
              <Selector id="d-para" value={d.paraId} onChange={(e) => setD({ ...d, paraId: e.target.value })}>
                {estado.usuarios
                  .filter((u) => u.rol === "Director")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre}
                    </option>
                  ))}
              </Selector>
            </Campo>
            <Campo etiqueta="Fecha de inicio" id="d-ini">
              <Entrada id="d-ini" type="date" value={d.fechaInicio} onChange={(e) => setD({ ...d, fechaInicio: e.target.value })} />
            </Campo>
            <Campo etiqueta="Fecha de fin" id="d-fin">
              <Entrada id="d-fin" type="date" value={d.fechaFin} onChange={(e) => setD({ ...d, fechaFin: e.target.value })} />
            </Campo>
            <Campo etiqueta="Motivo" id="d-mot">
              <Entrada id="d-mot" value={d.motivo} onChange={(e) => setD({ ...d, motivo: e.target.value })} />
            </Campo>
            <div className="md:col-span-4">
              <Boton type="submit">Generar delegación</Boton>
            </div>
          </form>
        ) : (
          <Aviso>Solo el Contralor puede crear o cancelar delegaciones.</Aviso>
        )}

        <div className="mt-4">
          <Tabla cabeceras={["Folio", "De", "Para", "Vigencia", "Motivo", "Estatus", ""]}>
            {estado.delegaciones.map((x) => (
              <tr key={x.folio}>
                <Celda>{x.folio}</Celda>
                <Celda>{estado.usuarios.find((u) => u.id === x.deId)?.nombre}</Celda>
                <Celda>{estado.usuarios.find((u) => u.id === x.paraId)?.nombre}</Celda>
                <Celda>
                  {x.fechaInicio} a {x.fechaFin}
                </Celda>
                <Celda>{x.motivo}</Celda>
                <Celda>
                  <Etiqueta tono={x.estatus === "Vigente" ? "ok" : "neutro"}>{x.estatus}</Etiqueta>
                </Celda>
                <Celda>
                  {esContralor && x.estatus === "Vigente" ? (
                    <Boton variante="neutro" onClick={() => void cancelarDelegacion(x.folio)}
                    >
                      Cancelar
                    </Boton>
                  ) : null}
                </Celda>
              </tr>
            ))}
          </Tabla>
        </div>
      </Panel>
    </div>
  );
}
