import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, mxn, diasDesde, fechaCorta, cuentaComprobado, estaPendiente, esBorrador } from "@/lib/store";
import { Panel, TituloPanel, Boton, Selector, Campo, Tabla, Celda, Etiqueta, Aviso } from "@/components/glass";
import { resta, suma } from "@/lib/dinero";

export const Route = createFileRoute("/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes y expediente nominal | Comprobación de Gastos" },
      {
        name: "description",
        content: "Reporte de avance por evento y expediente de evidencia nominal para auditoría.",
      },
      { property: "og:title", content: "Reportes y expediente nominal | Comprobación de Gastos" },
      {
        property: "og:description",
        content: "Vincula comprobantes con participantes, estatus final y dictaminador.",
      },
    ],
  }),
  component: Reportes,
});

function Reportes() {
  const { estado, registrar } = useStore();
  const [eventoId, setEventoId] = useState(estado.eventos[0]?.id ?? "");
  const [generado, setGenerado] = useState(false);

  const evento = estado.eventos.find((e) => e.id === eventoId);
  const gastosEv = estado.gastos.filter((g) => g.eventoId === eventoId && !esBorrador(g));

  return (
    <div className="grid gap-4 pt-4">
      <Panel>
        <TituloPanel icono="i-court" sub="Avance de comprobación por evento, comisionados pendientes y días de atraso.">
          Reporte de avance
        </TituloPanel>
        <Tabla
          cabeceras={["Evento", "% comprobado", "Pend. de comprobar", "Comisionados pendientes", "Días de atraso máximo"]}
          vacio="Aún no hay eventos registrados."
        >
          {estado.eventos.map((ev) => {
            const asig = estado.presupuestos.filter((p) => p.eventoId === ev.id).reduce((s, p) => suma(s, p.monto), 0);
            const gs = estado.gastos.filter((g) => g.eventoId === ev.id && !esBorrador(g));
            const comp = gs.filter(cuentaComprobado).reduce((s, g) => suma(s, g.montoMXN), 0);
            const pend = gs.filter(estaPendiente);
            const nombres = [
              ...new Set(pend.map((g) => estado.usuarios.find((u) => u.id === g.comisionadoId)?.nombre ?? "—")),
            ];
            const atraso = pend.length ? Math.max(...pend.map((g) => diasDesde(g.creadoEn))) : 0;
            return (
              <tr key={ev.id}>
                <Celda>
                  {ev.nombre} <span className="text-muted-foreground">({ev.clave})</span>
                  <p className="text-xs text-muted-foreground">
                    {mxn(comp)} de {mxn(asig)}
                  </p>
                </Celda>
                <Celda>{asig ? Math.round((comp / asig) * 100) : 0}%</Celda>
                <Celda>{mxn(resta(asig, comp))}</Celda>
                <Celda>{nombres.join(", ") || "Ninguno"}</Celda>
                <Celda>
                  <Etiqueta tono={atraso > 7 ? "error" : atraso >= 3 ? "alerta" : "ok"}>{atraso} días</Etiqueta>
                </Celda>
              </tr>
            );
          })}
        </Tabla>
      </Panel>

      <Panel>
        <TituloPanel icono="i-jersey" sub="Comprobantes por rubro, participantes asociados, estatus final y dictaminador.">
          Expediente de Evidencia Nominal
        </TituloPanel>
        <div className="flex flex-wrap items-end gap-3">
          <Campo etiqueta="Evento" id="rep-ev">
            <Selector id="rep-ev" value={eventoId} onChange={(e) => setEventoId(e.target.value)} className="md:w-80">
              {estado.eventos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </Selector>
          </Campo>
          <Boton
            onClick={() => {
              setGenerado(true);
              registrar("Expediente nominal", `Se generó el expediente de evidencia nominal de ${evento?.nombre}.`);
            }}
          >
            Generar Expediente de Evidencia Nominal
          </Boton>
        </div>

        {generado ? (
          <div className="mt-4 grid gap-3">
            <Aviso>
              Expediente de {evento?.nombre} ({evento?.clave}) generado el {fechaCorta(new Date().toISOString())}.
            </Aviso>
            <Tabla
              cabeceras={[
                "Rubro",
                "Comprobante",
                "Tipo de comprobante",
                "Monto",
                "Participantes",
                "Evidencia",
                "Estatus final",
                "Dictaminador",
                "Folio delegación",
              ]}
            >
              {gastosEv.map((g) => (
                <tr key={g.id}>
                  <Celda>{g.rubro}</Celda>
                  <Celda>{g.proveedor}</Celda>
                  <Celda>
                    <Etiqueta tono="neutro">{g.tipoComprobante}</Etiqueta>
                  </Celda>
                  <Celda>{mxn(g.montoMXN)}</Celda>
                  <Celda>
                    {g.participantesIds
                      .map((id) => evento?.participantes.find((p) => p.id === id)?.nombre ?? id)
                      .join(", ") || "—"}
                  </Celda>
                  <Celda>
                    {g.tipoComprobante === "Sin comprobante fiscal" && g.justificacion ? (
                      <p className="mb-1 text-xs text-muted-foreground">{g.justificacion}</p>
                    ) : null}
                    {g.archivos.length ? (
                      <ul className="grid gap-1">
                        {g.archivos.map((a, i) => (
                          <li key={`${a.nombre}-${i}`} className="flex items-center gap-2">
                            <Etiqueta tono="neutro">{tipoArchivo(a.nombre, a.tipo)}</Etiqueta>
                            <a
                              href={a.dataUrl}
                              download={a.nombre}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                            >
                              {a.nombre}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "—"
                    )}
                  </Celda>
                  <Celda>
                    <Etiqueta
                      tono={
                        g.estatus === "Aprobado" ? "ok" : g.estatus === "Rechazado" ? "error" : "neutro"
                      }
                    >
                      {g.estatus}
                    </Etiqueta>
                    {g.motivoRechazo ? <p className="text-xs">Motivo: {g.motivoRechazo}</p> : null}
                  </Celda>
                  <Celda>
                    {estado.usuarios.find((u) => u.id === g.dictaminadorId)?.nombre ?? "Pendiente"}
                    {g.revisorId ? (
                      <p className="text-xs text-muted-foreground">
                        Revisó: {estado.usuarios.find((u) => u.id === g.revisorId)?.nombre}
                      </p>
                    ) : null}
                  </Celda>
                  <Celda>{g.folioDelegacion ?? "—"}</Celda>
                </tr>
              ))}
            </Tabla>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Selecciona un evento y genera el expediente para auditoría.
          </p>
        )}
      </Panel>
    </div>
  );
}
