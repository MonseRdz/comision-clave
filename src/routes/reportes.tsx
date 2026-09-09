import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArchivoEnlace } from "@/components/archivo-enlace";
import { sumaAbonos } from "@/lib/pago";
import {
  documentacionAbierta,
  esCandidatoReintegro,
  faltantesDe,
  saldoEnDocumentacion,
  tieneSaldoEnDocumentacion,
} from "@/lib/documentacion";
import {
  useStore,
  mxn,
  diasDesde,
  fechaCorta,
  cuentaComprobado,
  cuentaEnDictamen,
  estaPendiente,
  esBorrador,
  montoComprobable,
  pendientePorEvidencia,
} from "@/lib/store";
import { Panel, TituloPanel, Boton, Selector, Campo, Tabla, Celda, Etiqueta, Aviso } from "@/components/glass";
import { resta, suma } from "@/lib/dinero";

export const Route = createFileRoute("/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes y expediente nominal | Tresora Comprobación" },
      {
        name: "description",
        content: "Reporte de avance por evento y expediente de evidencia nominal para auditoría.",
      },
      { property: "og:title", content: "Reportes y expediente nominal | Tresora Comprobación" },
      {
        property: "og:description",
        content: "Vincula comprobantes con participantes, estatus final y dictaminador.",
      },
    ],
  }),
  component: Reportes,
});

function tipoArchivo(nombre: string, tipo: string) {
  const n = nombre.toLowerCase();
  const t = (tipo || "").toLowerCase();
  if (n.endsWith(".xml") || t.includes("xml")) return "XML";
  if (n.endsWith(".pdf") || t.includes("pdf")) return "PDF";
  if (t.startsWith("image/") || /\.(jpe?g|png|heic|webp|gif)$/.test(n)) return "Imagen";
  return "Archivo";
}

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
          cabeceras={[
            "Evento",
            "% comprobado",
            "Pend. de comprobar",
            "Falta de pases",
            "Comisionados pendientes",
            "Días de atraso máximo",
          ]}
          vacio="Aún no hay eventos registrados."
        >
          {estado.eventos.map((ev) => {
            const asig = estado.presupuestos.filter((p) => p.eventoId === ev.id).reduce((s, p) => suma(s, p.monto), 0);
            const gs = estado.gastos.filter((g) => g.eventoId === ev.id && !esBorrador(g));
            const comp = gs.filter(cuentaComprobado).reduce((s, g) => suma(s, montoComprobable(g)), 0);
            const pases = gs
              .filter((g) => cuentaComprobado(g) || cuentaEnDictamen(g))
              .reduce((s, g) => suma(s, pendientePorEvidencia(g)), 0);
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
                <Celda>{mxn(pases)}</Celda>
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
                  <Celda>
                    {mxn(g.montoMXN)}
                    {pendientePorEvidencia(g) > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Comprobable {mxn(montoComprobable(g))} · falta de pases{" "}
                        {mxn(pendientePorEvidencia(g))}
                      </p>
                    ) : null}
                  </Celda>
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
                            <ArchivoEnlace archivo={a} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "—"
                    )}
                    <div className="mt-2 border-t border-hair pt-2">
                      {g.pago ? (
                        <>
                          <p className="text-xs text-muted-foreground">
                            Comprobante de pago · {g.pago.tipoDesembolso} · beneficiario{" "}
                            {g.pago.beneficiario} · {g.pago.formaPago} · {g.pago.fecha} · ref.{" "}
                            {g.pago.referencia} · {mxn(sumaAbonos(g.pago))}
                          </p>
                          <ul className="grid gap-1">
                            {g.pago.abonos.map((a, i) => (
                              <li key={`pago-${i}`} className="flex flex-wrap items-center gap-2">
                                <Etiqueta tono="neutro">Pago</Etiqueta>
                                <ArchivoEnlace archivo={a.archivo} />
                                <span className="text-xs text-muted-foreground">{mxn(a.monto)}</span>
                                {a.rep ? (
                                  <>
                                    <Etiqueta tono="neutro">REP</Etiqueta>
                                    <ArchivoEnlace archivo={a.rep} />
                                  </>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {g.pagoPendiente
                            ? "Comprobante de pago pendiente · trazabilidad incompleta"
                            : "Sin comprobante de pago"}
                        </p>
                      )}
                    </div>
                  </Celda>
                  <Celda>
                    <Etiqueta
                      tono={
                        g.estatus === "Aprobado" ? "ok" : g.estatus === "Rechazado" ? "error" : "neutro"
                      }
                    >
                      {tieneSaldoEnDocumentacion(g) ? "Aprobado (parcial)" : g.estatus}
                    </Etiqueta>
                    {g.motivoRechazo ? <p className="text-xs">Motivo: {g.motivoRechazo}</p> : null}
                    {tieneSaldoEnDocumentacion(g) ? (
                      <div className="mt-1 text-xs">
                        <p className="font-semibold text-warning">
                          Saldo en documentación {mxn(saldoEnDocumentacion(g))} · responsable{" "}
                          {estado.usuarios.find(
                            (u) => u.id === documentacionAbierta(g)?.responsableId,
                          )?.nombre ?? "—"}{" "}
                          · fecha compromiso {documentacionAbierta(g)?.fechaCompromiso}
                          {esCandidatoReintegro(g) ? " · candidato a reintegro" : ""}
                        </p>
                        <ul className="text-muted-foreground">
                          {faltantesDe(g).map((v) => (
                            <li key={v.participanteId}>
                              Falta {v.falta} de{" "}
                              {evento?.participantes.find((p) => p.id === v.participanteId)?.nombre ??
                                v.participanteId}{" "}
                              · {mxn(v.importe)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {(g.documentacion?.cierres ?? []).length ? (
                      <ul className="mt-1 text-xs text-muted-foreground">
                        {(g.documentacion?.cierres ?? []).map((c, i) => (
                          <li key={`c${i}`}>
                            Saldo cerrado {mxn(c.monto)} el {fechaCorta(c.fecha)} por{" "}
                            {estado.usuarios.find((u) => u.id === c.actorId)?.nombre ?? "Contralor"}
                          </li>
                        ))}
                      </ul>
                    ) : null}
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
