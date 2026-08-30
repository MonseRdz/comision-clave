import { createFileRoute } from "@tanstack/react-router";
import { resta, suma } from "@/lib/dinero";
import { useState } from "react";
import { useStore, mxn, nuevoId, cuentaComprobado } from "@/lib/store";
import {
  Panel,
  TituloPanel,
  Boton,
  Campo,
  Entrada,
  Selector,
  Aviso,
  Tabla,
  Celda,
} from "@/components/glass";

export const Route = createFileRoute("/presupuestos")({
  head: () => ({
    meta: [
      { title: "Presupuestos por rubro | Comprobación de Gastos" },
      {
        name: "description",
        content: "Asignación de montos por evento y rubro con comisionado responsable.",
      },
      { property: "og:title", content: "Presupuestos por rubro | Comprobación de Gastos" },
      {
        property: "og:description",
        content: "Define techos de gasto por rubro y asigna responsables de comprobación.",
      },
    ],
  }),
  component: Presupuestos,
});

function Presupuestos() {
  const { estado, setEstado, registrar, usuarioActual, delegacionVigente } = useStore();
  const comisionados = estado.usuarios.filter((u) => u.rol === "Comisionado");
  const [f, setF] = useState({
    eventoId: estado.eventos[0]?.id ?? "",
    rubro: estado.rubros[0] ?? "",
    monto: "",
    responsableId: comisionados[0]?.id ?? "",
  });
  const [aviso, setAviso] = useState("");

  const delegadoAlDirector =
    usuarioActual.rol === "Director" && delegacionVigente?.paraId === usuarioActual.id;
  const puedeAsignar = usuarioActual.rol === "Contralor" || delegadoAlDirector;

  if (!puedeAsignar) {
    return (
      <Panel className="mt-4">
        <TituloPanel>Acceso restringido</TituloPanel>
        <Aviso tono="alerta">
          {usuarioActual.rol === "Director"
            ? "El Director solo puede asignar y aprobar presupuestos con una delegación de autoridad vigente del Contralor."
            : "Solo el Contralor (o el Director con delegación vigente) puede asignar presupuestos."}
        </Aviso>
      </Panel>
    );
  }

  function asignar(ev: React.FormEvent) {
    ev.preventDefault();
    const monto = Number(f.monto);
    if (!f.eventoId || !f.rubro || !f.responsableId) return setAviso("Completa todos los campos.");
    if (!Number.isFinite(monto) || monto <= 0) return setAviso("El monto debe ser mayor a cero.");
    const p = { id: nuevoId("b"), eventoId: f.eventoId, rubro: f.rubro, monto, responsableId: f.responsableId };
    setEstado((e) => ({ ...e, presupuestos: [...e.presupuestos, p] }));
    const evento = estado.eventos.find((e) => e.id === f.eventoId);
    const resp = estado.usuarios.find((u) => u.id === f.responsableId);
    registrar(
      "Asignación de presupuesto",
      `${mxn(monto)} al rubro ${f.rubro} de ${evento?.nombre} bajo ${resp?.nombre}.`,
    );
    setAviso(`Asignados ${mxn(monto)} a "${f.rubro}" en ${evento?.nombre} — responsable ${resp?.nombre}.`);
    setF({ ...f, monto: "" });
  }

  return (
    <div className="grid gap-4 pt-4">
      {aviso ? <Aviso>{aviso}</Aviso> : null}
      <Panel>
        <TituloPanel sub="Monto por evento y rubro, con comisionado responsable.">
          Asignar presupuesto
        </TituloPanel>
        <form onSubmit={asignar} className="grid gap-3 md:grid-cols-4 md:items-end">
          <Campo etiqueta="Evento" id="pr-ev">
            <Selector id="pr-ev" value={f.eventoId} onChange={(e) => setF({ ...f, eventoId: e.target.value })}>
              {estado.eventos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </Selector>
          </Campo>
          <Campo etiqueta="Rubro de gasto" id="pr-rubro">
            <Selector id="pr-rubro" value={f.rubro} onChange={(e) => setF({ ...f, rubro: e.target.value })}>
              {estado.rubros.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Selector>
          </Campo>
          <Campo etiqueta="Monto asignado (MXN)" id="pr-monto">
            <Entrada
              id="pr-monto"
              type="number"
              min={1}
              step="0.01"
              value={f.monto}
              onChange={(e) => setF({ ...f, monto: e.target.value })}
            />
          </Campo>
          <Campo etiqueta="Comisionado responsable" id="pr-resp">
            <Selector
              id="pr-resp"
              value={f.responsableId}
              onChange={(e) => setF({ ...f, responsableId: e.target.value })}
            >
              {comisionados.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </Selector>
          </Campo>
          <div className="md:col-span-4">
            <Boton type="submit">Asignar presupuesto</Boton>
          </div>
        </form>
      </Panel>

      <Panel>
        <TituloPanel>Presupuestos asignados</TituloPanel>
        <Tabla cabeceras={["Evento", "Rubro", "Asignado", "Comprobado", "Disponible", "Responsable"]}>
          {estado.presupuestos.map((p) => {
            const comprobado = estado.gastos
              .filter((g) => g.eventoId === p.eventoId && g.rubro === p.rubro && cuentaComprobado(g))
              .reduce((s, g) => suma(s, g.montoMXN), 0);
            return (
              <tr key={p.id}>
                <Celda>{estado.eventos.find((e) => e.id === p.eventoId)?.nombre}</Celda>
                <Celda>{p.rubro}</Celda>
                <Celda>{mxn(p.monto)}</Celda>
                <Celda>{mxn(comprobado)}</Celda>
                <Celda>{mxn(resta(p.monto, comprobado))}</Celda>
                <Celda>{estado.usuarios.find((u) => u.id === p.responsableId)?.nombre}</Celda>
              </tr>
            );
          })}
        </Tabla>
      </Panel>
    </div>
  );
}
