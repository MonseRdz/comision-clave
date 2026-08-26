import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, mxn, nuevoId, fechaHora } from "@/lib/store";
import { ROLES, type Rol } from "@/lib/types";
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
  Etiqueta,
} from "@/components/glass";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Usuarios y configuración | Comprobación de Gastos" },
      {
        name: "description",
        content: "Alta de usuarios con rol, tope de gastos sin comprobante y catálogos maestros.",
      },
      { property: "og:title", content: "Usuarios y configuración | Comprobación de Gastos" },
      {
        property: "og:description",
        content: "Administra roles, topes y catálogos de la comprobación de gastos.",
      },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { estado, setEstado, registrar, usuarioActual } = useStore();
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<Rol>("Comisionado");
  const [tope, setTope] = useState(String(estado.topeSinComprobante));
  const [rubro, setRubro] = useState("");
  const [motivo, setMotivo] = useState("");
  const [aviso, setAviso] = useState("");

  const esAdmin = usuarioActual.rol === "Administrador";

  if (!esAdmin) {
    return (
      <Panel className="mt-4">
        <TituloPanel>Acceso restringido</TituloPanel>
        <Aviso tono="alerta">
          Solo el rol Administrador puede gestionar usuarios y configuración.
        </Aviso>
      </Panel>
    );
  }

  function crearUsuario(ev: React.FormEvent) {
    ev.preventDefault();
    if (!nombre.trim()) return setAviso("Escribe el nombre del usuario.");
    const u = { id: nuevoId("u"), nombre: nombre.trim(), rol, activo: true };
    setEstado((e) => ({ ...e, usuarios: [...e.usuarios, u] }));
    registrar("Alta de usuario", `Se creó a ${u.nombre} con rol ${u.rol}.`);
    setAviso(`Usuario "${u.nombre}" creado con rol ${u.rol}.`);
    setNombre("");
  }

  function guardarTope(ev: React.FormEvent) {
    ev.preventDefault();
    const valor = Number(tope);
    if (!Number.isFinite(valor) || valor <= 0) return setAviso("El tope debe ser un monto mayor a cero.");
    setEstado((e) => ({ ...e, topeSinComprobante: valor }));
    registrar("Configuración", `Tope de gastos sin comprobante fijado en ${mxn(valor)}.`);
    setAviso(`Tope sin factura actualizado a ${mxn(valor)}.`);
  }

  return (
    <div className="grid gap-4 pt-4">
      {aviso ? <Aviso>{aviso}</Aviso> : null}

      <Panel>
        <TituloPanel sub="Alta de usuarios con rol dentro del proceso de comprobación.">
          Usuarios
        </TituloPanel>
        <form onSubmit={crearUsuario} className="grid gap-3 md:grid-cols-[2fr_1fr_auto] md:items-end">
          <Campo etiqueta="Nombre completo" id="nuevo-nombre">
            <Entrada
              id="nuevo-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Juan Entrenador"
            />
          </Campo>
          <Campo etiqueta="Rol" id="nuevo-rol">
            <Selector id="nuevo-rol" value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Selector>
          </Campo>
          <Boton type="submit">Crear usuario</Boton>
        </form>

        <div className="mt-4">
          <Tabla cabeceras={["Nombre", "Rol", "Estatus"]}>
            {estado.usuarios.map((u) => (
              <tr key={u.id}>
                <Celda>{u.nombre}</Celda>
                <Celda>{u.rol}</Celda>
                <Celda>
                  <Etiqueta tono={u.activo ? "ok" : "neutro"}>{u.activo ? "Activo" : "Inactivo"}</Etiqueta>
                </Celda>
              </tr>
            ))}
          </Tabla>
        </div>
      </Panel>

      <Panel>
        <TituloPanel sub="Monto máximo permitido para un gasto sin comprobante fiscal.">
          Tope de gastos sin comprobante
        </TituloPanel>
        <form onSubmit={guardarTope} className="flex flex-wrap items-end gap-3">
          <Campo etiqueta="Tope en MXN" id="tope" ayuda="Valor por defecto: $2,000 MXN">
            <Entrada
              id="tope"
              type="number"
              min={1}
              step="0.01"
              value={tope}
              onChange={(e) => setTope(e.target.value)}
              className="w-48"
            />
          </Campo>
          <Boton type="submit">Guardar tope</Boton>
          <Etiqueta tono="marca">Vigente: {mxn(estado.topeSinComprobante)}</Etiqueta>
        </form>
      </Panel>

      <Panel>
        <TituloPanel sub="Rubros de gasto y motivos de rechazo disponibles en el sistema.">
          Catálogos maestros
        </TituloPanel>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <form
              className="flex items-end gap-2"
              onSubmit={(ev) => {
                ev.preventDefault();
                if (!rubro.trim()) return;
                setEstado((e) => ({ ...e, rubros: [...e.rubros, rubro.trim()] }));
                registrar("Catálogo", `Se agregó el rubro ${rubro.trim()}.`);
                setRubro("");
              }}
            >
              <Campo etiqueta="Nuevo rubro" id="rubro">
                <Entrada id="rubro" value={rubro} onChange={(e) => setRubro(e.target.value)} />
              </Campo>
              <Boton type="submit" variante="neutro">
                Agregar
              </Boton>
            </form>
            <ul className="mt-3 flex flex-wrap gap-2">
              {estado.rubros.map((r) => (
                <li key={r}>
                  <Etiqueta>{r}</Etiqueta>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <form
              className="flex items-end gap-2"
              onSubmit={(ev) => {
                ev.preventDefault();
                if (!motivo.trim()) return;
                setEstado((e) => ({ ...e, motivosRechazo: [...e.motivosRechazo, motivo.trim()] }));
                registrar("Catálogo", `Se agregó el motivo de rechazo ${motivo.trim()}.`);
                setMotivo("");
              }}
            >
              <Campo etiqueta="Nuevo motivo de rechazo" id="motivo">
                <Entrada id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
              </Campo>
              <Boton type="submit" variante="neutro">
                Agregar
              </Boton>
            </form>
            <ul className="mt-3 flex flex-wrap gap-2">
              {estado.motivosRechazo.map((m) => (
                <li key={m}>
                  <Etiqueta>{m}</Etiqueta>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>

      <Panel>
        <TituloPanel sub="Registro histórico inmutable de toda acción.">Bitácora</TituloPanel>
        <Tabla cabeceras={["Fecha y hora", "Usuario", "Acción", "Detalle"]}>
          {estado.bitacora.slice(0, 40).map((b) => (
            <tr key={b.id}>
              <Celda>{fechaHora(b.fecha)}</Celda>
              <Celda>{b.actor}</Celda>
              <Celda>{b.accion}</Celda>
              <Celda>{b.detalle}</Celda>
            </tr>
          ))}
        </Tabla>
      </Panel>
    </div>
  );
}
