import { lugarTexto } from "@/lib/paises";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, mxn, fechaCorta, diasDesde } from "@/lib/store";
import type { Gasto } from "@/lib/types";
import {
  Panel,
  TituloPanel,
  Boton,
  Campo,
  AreaTexto,
  Aviso,
  Etiqueta,
  Tabla,
  Celda,
} from "@/components/glass";

export const Route = createFileRoute("/revision")({
  head: () => ({
    meta: [
      { title: "Validación técnica | Comprobación de Gastos" },
      {
        name: "description",
        content: "Consola del Revisor para validar comprobaciones o devolverlas con observaciones.",
      },
      { property: "og:title", content: "Validación técnica | Comprobación de Gastos" },
      {
        property: "og:description",
        content: "Dictamen técnico de primer nivel sobre los gastos comprobados.",
      },
    ],
  }),
  component: Revision,
});

function Revision() {
  const { estado, setEstado, registrar, usuarioActual } = useStore();
  const [obs, setObs] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState("");

  if (usuarioActual.rol !== "Revisor") {
    return (
      <Panel className="mt-4">
        <TituloPanel>Acceso restringido</TituloPanel>
        <Aviso tono="alerta">Esta consola es exclusiva del rol Revisor.</Aviso>
      </Panel>
    );
  }

  const pendientes = estado.gastos.filter(
    (g) => g.estatus === "Registrado" || g.estatus === "Devuelto para corrección",
  );

  function actualizar(g: Gasto, estatus: Gasto["estatus"], observaciones: string, texto: string) {
    setEstado((e) => ({
      ...e,
      gastos: e.gastos.map((x) =>
        x.id === g.id ? { ...x, estatus, observaciones, revisorId: usuarioActual.id } : x,
      ),
    }));
    registrar("Dictamen técnico", texto);
    setAviso(texto);
  }

  return (
    <div className="grid gap-4 pt-4">
      {aviso ? <Aviso>{aviso}</Aviso> : null}
      <Panel>
        <TituloPanel sub="Revisión de primer nivel: envía al Contralor o devuelve al comisionado.">
          Consola de validación técnica
        </TituloPanel>
        <Tabla cabeceras={["Gasto", "Monto", "Antigüedad", "Evidencia", "Estatus", "Dictamen"]}>
          {pendientes.map((g) => {
            const comisionado = estado.usuarios.find((u) => u.id === g.comisionadoId);
            return (
              <tr key={g.id}>
                <Celda>
                  <strong>{g.proveedor}</strong>
                  <p className="text-xs text-muted-foreground">
                    {estado.eventos.find((e) => e.id === g.eventoId)?.nombre} · {g.rubro} ·{" "}
                    {comisionado?.nombre}
                  </p>
                </Celda>
                <Celda>{mxn(g.montoMXN)}</Celda>
                <Celda>
                  {fechaCorta(g.creadoEn)}
                  <br />
                  <Etiqueta tono={diasDesde(g.creadoEn) > 7 ? "error" : diasDesde(g.creadoEn) >= 3 ? "alerta" : "ok"}>
                    {diasDesde(g.creadoEn)} días
                  </Etiqueta>
                </Celda>
                <Celda>
                  {g.sinCFDI ? <p>Sin CFDI — {g.justificacion}</p> : null}
                  {g.archivos.length ? (
                    <ul className="space-y-1">
                      {g.archivos.map((a) => (
                        <li key={a.nombre}>
                          {a.dataUrl ? (
                            <a
                              className="font-semibold underline"
                              href={a.dataUrl}
                              target="_blank"
                              rel="noreferrer"
                              download={a.nombre}
                            >
                              Ver o descargar {a.nombre}
                            </a>
                          ) : (
                            <span>{a.nombre} (documento de ejemplo)</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">Sin archivos adjuntos.</p>
                  )}
                  {g.origenPais || g.destinoPais ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Traslado:{" "}
                      {rutaTexto(
                        { pais: g.origenPais, ciudad: g.origenCiudad },
                        g.escalas ?? [],
                        { pais: g.destinoPais, ciudad: g.destinoCiudad },
                      )}
                      {(g.escalas?.length ?? 0) > 0 ? ` · ${g.escalas.length} escala(s)` : ""}
                    </p>
                  ) : null}
                  {g.rubro === "Transporte"
                    ? (() => {
                        const nominales =
                          estado.eventos.find((e) => e.id === g.eventoId)?.participantes ?? [];
                        const faltan = nominales.filter(
                          (p) => !g.archivos.some((a) => a.participanteId === p.id),
                        );
                        return faltan.length ? (
                          <p className="mt-1 text-xs font-semibold">
                            Evidencia incompleta: faltan pases de abordar de{" "}
                            {faltan.map((p) => p.nombre).join(", ")}.
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Pases de abordar completos ({nominales.length}).
                          </p>
                        );
                      })()
                    : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Participantes:{" "}
                    {g.participantesIds
                      .map(
                        (id) =>
                          estado.eventos
                            .find((e) => e.id === g.eventoId)
                            ?.participantes.find((p) => p.id === id)?.nombre ?? id,
                      )
                      .join(", ")}
                  </p>
                </Celda>
                <Celda>
                  <Etiqueta tono={g.estatus === "Devuelto para corrección" ? "alerta" : "neutro"}>
                    {g.estatus}
                  </Etiqueta>
                </Celda>
                <Celda>
                  <Campo etiqueta="Observaciones" id={`obs-${g.id}`}>
                    <AreaTexto
                      id={`obs-${g.id}`}
                      value={obs[g.id] ?? g.observaciones}
                      onChange={(e) => setObs({ ...obs, [g.id]: e.target.value })}
                      placeholder="Ej. Falta pase de abordar"
                    />
                  </Campo>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Boton
                      onClick={() =>
                        actualizar(
                          g,
                          "Validado por Revisor",
                          obs[g.id] ?? g.observaciones,
                          `Gasto de ${g.proveedor} validado técnicamente y enviado al Contralor.`,
                        )
                      }
                    >
                      Validar y enviar al Contralor
                    </Boton>
                    <Boton
                      variante="peligro"
                      onClick={() => {
                        const texto = (obs[g.id] ?? "").trim();
                        if (!texto) {
                          setAviso("Escribe una observación antes de devolver el gasto.");
                          return;
                        }
                        actualizar(
                          g,
                          "Devuelto para corrección",
                          texto,
                          `Gasto de ${g.proveedor} devuelto a ${estado.usuarios.find((u) => u.id === g.comisionadoId)?.nombre}: "${texto}".`,
                        );
                      }}
                    >
                      Devolver al comisionado
                    </Boton>
                  </div>
                </Celda>
              </tr>
            );
          })}
        </Tabla>
        {pendientes.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No hay gastos pendientes de validación técnica.</p>
        ) : null}
      </Panel>
    </div>
  );
}
