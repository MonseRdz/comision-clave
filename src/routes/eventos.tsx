import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, nuevoId, fechaCorta } from "@/lib/store";
import type { Participante } from "@/lib/types";
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

export const Route = createFileRoute("/eventos")({
  head: () => ({
    meta: [
      { title: "Eventos y participantes | Tresora Comprobación" },
      {
        name: "description",
        content: "Registro de eventos deportivos y carga de la lista nominal autorizada.",
      },
      { property: "og:title", content: "Eventos y participantes | Tresora Comprobación" },
      {
        property: "og:description",
        content: "Configura torneos, sedes, claves presupuestales y participantes autorizados.",
      },
    ],
  }),
  component: Eventos,
});

function Eventos() {
  const { estado, setEstado, registrar } = useStore();
  const [f, setF] = useState({
    nombre: "",
    sede: "",
    fechaInicio: "",
    fechaFin: "",
    clave: "",
    estatus: "Activo" as "Activo" | "Próximo" | "Cerrado",
  });
  const [aviso, setAviso] = useState("");
  const [sel, setSel] = useState(estado.eventos[0]?.id ?? "");
  const [pNombre, setPNombre] = useState("");
  const [pTipo, setPTipo] = useState<Participante["tipo"]>("Jugador");

  const evento = estado.eventos.find((e) => e.id === sel);

  function crear(ev: React.FormEvent) {
    ev.preventDefault();
    if (!f.nombre.trim() || !f.clave.trim() || !f.sede.trim())
      return setAviso("Nombre, sede y clave presupuestal son obligatorios.");
    const nuevo = { id: nuevoId("e"), ...f, nombre: f.nombre.trim(), participantes: [] };
    setEstado((e) => ({ ...e, eventos: [...e.eventos, nuevo] }));
    registrar("Alta de evento", `Se registró "${nuevo.nombre}" (clave ${nuevo.clave}).`);
    setAviso(`Evento "${nuevo.nombre}" registrado.`);
    setSel(nuevo.id);
    setF({ nombre: "", sede: "", fechaInicio: "", fechaFin: "", clave: "", estatus: "Activo" });
  }

  function agregarParticipante(ev: React.FormEvent) {
    ev.preventDefault();
    if (!evento || !pNombre.trim()) return;
    const p: Participante = { id: nuevoId("p"), nombre: pNombre.trim(), tipo: pTipo };
    setEstado((e) => ({
      ...e,
      eventos: e.eventos.map((x) =>
        x.id === evento.id ? { ...x, participantes: [...x.participantes, p] } : x,
      ),
    }));
    registrar(
      "Lista nominal",
      `Se autorizó a ${p.nombre} (${p.tipo}) en el evento ${evento.nombre}.`,
    );
    setAviso(`${p.nombre} agregado a la lista nominal de ${evento.nombre}.`);
    setPNombre("");
  }

  return (
    <div className="grid gap-4 pt-4">
      {aviso ? <Aviso>{aviso}</Aviso> : null}

      <Panel>
        <TituloPanel sub="Nombre, sede, fechas y clave presupuestal.">Registrar evento</TituloPanel>
        <form onSubmit={crear} className="grid gap-3 md:grid-cols-3">
          <Campo etiqueta="Nombre del evento" id="ev-nombre">
            <Entrada id="ev-nombre" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
          </Campo>
          <Campo etiqueta="Sede" id="ev-sede">
            <Entrada id="ev-sede" value={f.sede} onChange={(e) => setF({ ...f, sede: e.target.value })} />
          </Campo>
          <Campo etiqueta="Clave presupuestal" id="ev-clave">
            <Entrada id="ev-clave" value={f.clave} onChange={(e) => setF({ ...f, clave: e.target.value })} />
          </Campo>
          <Campo etiqueta="Fecha de inicio" id="ev-ini">
            <Entrada id="ev-ini" type="date" value={f.fechaInicio} onChange={(e) => setF({ ...f, fechaInicio: e.target.value })} />
          </Campo>
          <Campo etiqueta="Fecha de fin" id="ev-fin">
            <Entrada id="ev-fin" type="date" value={f.fechaFin} onChange={(e) => setF({ ...f, fechaFin: e.target.value })} />
          </Campo>
          <Campo etiqueta="Estatus" id="ev-est">
            <Selector
              id="ev-est"
              value={f.estatus}
              onChange={(e) => setF({ ...f, estatus: e.target.value as typeof f.estatus })}
            >
              <option>Activo</option>
              <option>Próximo</option>
              <option>Cerrado</option>
            </Selector>
          </Campo>
          <div className="md:col-span-3">
            <Boton type="submit">Registrar evento</Boton>
          </div>
        </form>
      </Panel>

      <Panel>
        <TituloPanel sub="Deportistas y personal autorizado por evento.">Lista nominal</TituloPanel>
        <Campo etiqueta="Evento" id="ev-sel">
          <Selector id="ev-sel" value={sel} onChange={(e) => setSel(e.target.value)} className="md:w-96">
            {estado.eventos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre} ({e.clave})
              </option>
            ))}
          </Selector>
        </Campo>

        {evento ? (
          <>
            <form onSubmit={agregarParticipante} className="mt-3 flex flex-wrap items-end gap-3">
              <Campo etiqueta="Nombre del participante" id="p-nombre">
                <Entrada id="p-nombre" value={pNombre} onChange={(e) => setPNombre(e.target.value)} />
              </Campo>
              <Campo etiqueta="Tipo" id="p-tipo">
                <Selector
                  id="p-tipo"
                  value={pTipo}
                  onChange={(e) => setPTipo(e.target.value as Participante["tipo"])}
                >
                  <option>Jugador</option>
                  <option>Jugadora</option>
                  <option>Entrenador</option>
                  <option>Administrativo</option>
                </Selector>
              </Campo>
              <Boton type="submit">Agregar participante</Boton>
            </form>
            <div className="mt-4">
              <Tabla cabeceras={["Participante", "Tipo"]}>
                {evento.participantes.map((p) => (
                  <tr key={p.id}>
                    <Celda>{p.nombre}</Celda>
                    <Celda>{p.tipo}</Celda>
                  </tr>
                ))}
              </Tabla>
            </div>
          </>
        ) : null}
      </Panel>

      <Panel>
        <TituloPanel>Eventos registrados</TituloPanel>
        <Tabla cabeceras={["Evento", "Clave", "Sede", "Fechas", "Estatus", "Participantes"]}>
          {estado.eventos.map((e) => (
            <tr key={e.id}>
              <Celda>{e.nombre}</Celda>
              <Celda>{e.clave}</Celda>
              <Celda>{e.sede}</Celda>
              <Celda>
                {e.fechaInicio ? fechaCorta(e.fechaInicio) : "—"} a {e.fechaFin ? fechaCorta(e.fechaFin) : "—"}
              </Celda>
              <Celda>
                <Etiqueta tono={e.estatus === "Activo" ? "ok" : "neutro"}>{e.estatus}</Etiqueta>
              </Celda>
              <Celda>{e.participantes.map((p) => p.nombre).join(", ") || "Sin participantes"}</Celda>
            </tr>
          ))}
        </Tabla>
      </Panel>
    </div>
  );
}
