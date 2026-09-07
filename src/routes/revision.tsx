import { rutaTexto } from "@/lib/paises";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStore, mxn, fechaCorta, diasDesde } from "@/lib/store";
import { actualizarGasto, cargarGastosPorEstatus } from "@/lib/db";
import { ArchivoEnlace } from "@/components/archivo-enlace";
import { DesgloseViajeros } from "@/components/desglose-viajeros";

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
      { title: "Validación técnica | Tresora Comprobación" },
      {
        name: "description",
        content: "Consola del Revisor para validar comprobaciones o devolverlas con observaciones.",
      },
      { property: "og:title", content: "Validación técnica | Tresora Comprobación" },
      {
        property: "og:description",
        content: "Dictamen técnico de primer nivel sobre los gastos comprobados.",
      },
    ],
  }),
  component: Revision,
});

function Revision() {
  const { estado, aplicarGasto, registrar, usuarioActual } = useStore();
  const [obs, setObs] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const [pendientes, setPendientes] = useState<Gasto[]>([]);

  if (usuarioActual.rol !== "Revisor") {
    return (
      <Panel className="mt-4">
        <TituloPanel>Acceso restringido</TituloPanel>
        <Aviso tono="alerta">Esta consola es exclusiva del rol Revisor.</Aviso>
      </Panel>
    );
  }

  // La consola consulta solo lo que necesita: gastos presentados o devueltos.
  useEffect(() => {
    let vivo = true;
    const traer = () =>
      cargarGastosPorEstatus(["Registrado", "Devuelto para corrección"])
        .then((lista) => {
          if (vivo) setPendientes(lista);
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    void traer();
    window.addEventListener("focus", traer);
    return () => {
      vivo = false;
      window.removeEventListener("focus", traer);
    };
  }, [estado.gastos]);

  async function actualizar(g: Gasto, estatus: Gasto["estatus"], observaciones: string, texto: string) {
    try {
      const guardado = await actualizarGasto(g.id, {
        estatus,
        observaciones,
        revisor_id: usuarioActual.id,
      });
      aplicarGasto(guardado);
      setPendientes((lista) =>
        estatus === "Registrado" || estatus === "Devuelto para corrección"
          ? lista.map((x) => (x.id === guardado.id ? guardado : x))
          : lista.filter((x) => x.id !== guardado.id),
      );
      await registrar("Dictamen técnico", texto);
      setError("");
      setAviso(texto);
    } catch (err: unknown) {
      setAviso("");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="grid gap-4 pt-4">
      {error ? <Aviso tono="error">{error}</Aviso> : null}
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
                          <ArchivoEnlace archivo={a} etiqueta={`Ver o descargar ${a.nombre}`} />
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
                  <DesgloseViajeros gasto={g} />

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
