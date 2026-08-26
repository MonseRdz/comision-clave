import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, mxn, fechaCorta } from "@/lib/store";
import type { Gasto } from "@/lib/types";
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
      { title: "Aprobación definitiva | Comprobación de Gastos" },
      {
        name: "description",
        content: "Consola del Contralor para aprobar o rechazar gastos y delegar facultades.",
      },
      { property: "og:title", content: "Aprobación definitiva | Comprobación de Gastos" },
      {
        property: "og:description",
        content: "Dictamen final inmutable y gestión de delegaciones de autoridad.",
      },
    ],
  }),
  component: Aprobacion,
});

function Aprobacion() {
  const { estado, setEstado, registrar, usuarioActual, puedeAprobar, delegacionVigente } = useStore();
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState("");
  const [d, setD] = useState({
    paraId: estado.usuarios.find((u) => u.rol === "Director")?.id ?? "",
    fechaInicio: "",
    fechaFin: "",
    motivo: "",
  });

  const esContralor = usuarioActual.rol === "Contralor";
  const porAprobar = estado.gastos.filter((g) => g.estatus === "Validado por Revisor");

  function dictaminar(g: Gasto, estatus: "Aprobado" | "Rechazado", motivo?: string) {
    const folio = usuarioActual.rol === "Director" ? delegacionVigente?.folio : undefined;
    setEstado((e) => ({
      ...e,
      gastos: e.gastos.map((x) =>
        x.id === g.id
          ? {
              ...x,
              estatus,
              dictaminadorId: usuarioActual.id,
              motivoRechazo: estatus === "Rechazado" ? motivo : undefined,
              folioDelegacion: folio,
            }
          : x,
      ),
    }));
    const texto = `Gasto de ${g.proveedor} por ${mxn(g.montoMXN)} ${estatus.toLowerCase()} por ${usuarioActual.nombre}${
      folio ? ` (delegación ${folio})` : ""
    }${motivo ? ` — motivo: ${motivo}` : ""}.`;
    registrar("Dictamen definitivo", texto);
    setAviso(texto);
  }

  function crearDelegacion(ev: React.FormEvent) {
    ev.preventDefault();
    if (!d.paraId || !d.fechaInicio || !d.fechaFin || !d.motivo.trim())
      return setAviso("Completa destinatario, fechas y motivo de la delegación.");
    const folio = `DEL-${String(estado.delegaciones.length + 1).padStart(3, "0")}`;
    const nueva = { folio, deId: usuarioActual.id, ...d, motivo: d.motivo.trim(), estatus: "Vigente" as const };
    setEstado((e) => ({ ...e, delegaciones: [...e.delegaciones, nueva] }));
    const para = estado.usuarios.find((u) => u.id === d.paraId);
    registrar(
      "Delegación de autoridad",
      `Folio ${folio}: facultades delegadas a ${para?.nombre} del ${d.fechaInicio} al ${d.fechaFin} por "${nueva.motivo}".`,
    );
    setAviso(`Delegación ${folio} creada hacia ${para?.nombre} (${d.fechaInicio} a ${d.fechaFin}).`);
    setD({ ...d, fechaInicio: "", fechaFin: "", motivo: "" });
  }

  return (
    <div className="grid gap-4 pt-4">
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
            <tr key={g.id}>
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
                    <Boton variante="exito" onClick={() => dictaminar(g, "Aprobado")}>
                      Aprobar definitivamente
                    </Boton>
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
          ))}
        </Tabla>
        {porAprobar.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No hay gastos validados en espera de aprobación.</p>
        ) : null}
      </Panel>

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
                    <Boton
                      variante="neutro"
                      onClick={() => {
                        setEstado((e) => ({
                          ...e,
                          delegaciones: e.delegaciones.map((y) =>
                            y.folio === x.folio ? { ...y, estatus: "Cancelada" as const } : y,
                          ),
                        }));
                        registrar("Delegación cancelada", `Se canceló la delegación ${x.folio}.`);
                        setAviso(`Delegación ${x.folio} cancelada.`);
                      }}
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
