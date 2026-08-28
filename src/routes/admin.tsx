import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore, mxn, fechaHora } from "@/lib/store";
import { enviarCorreoPrueba } from "@/lib/email.functions";
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
        content:
          "Aprobación de solicitudes de acceso, asignación de roles, tope de gastos sin comprobante y catálogos maestros.",
      },
      { property: "og:title", content: "Usuarios y configuración | Comprobación de Gastos" },
      {
        property: "og:description",
        content: "Administra accesos, roles, topes y catálogos de la comprobación de gastos.",
      },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { estado, setEstado, registrar, usuarioActual, perfiles, recargar } = useStore();
  const [tope, setTope] = useState(String(estado.topeSinComprobante));
  const [rubro, setRubro] = useState("");
  const [motivo, setMotivo] = useState("");
  const [aviso, setAviso] = useState("");
  const [rolSolicitud, setRolSolicitud] = useState<Record<string, Rol>>({});
  const [ocupado, setOcupado] = useState("");
  const [correoPrueba, setCorreoPrueba] = useState("");

  const esAdmin = usuarioActual.rol === "Contralor";

  if (!esAdmin) {
    return (
      <Panel className="mt-4">
        <TituloPanel>Acceso restringido</TituloPanel>
        <Aviso tono="alerta">
          Solo el rol Contralor puede gestionar usuarios y configuración.
        </Aviso>
      </Panel>
    );
  }

  const solicitudes = perfiles.filter((p) => p.estatus === "Pendiente" || !p.rol);
  const autorizados = perfiles.filter((p) => p.estatus !== "Pendiente" && p.rol);

  async function aprobar(id: string, nombre: string) {
    const rol = rolSolicitud[id] ?? "Comisionado";
    setOcupado(id);
    const { error: e1 } = await supabase.from("user_roles").insert({ user_id: id, role: rol });
    const { error: e2 } = await supabase
      .from("profiles")
      .update({ estatus: "Aprobado" })
      .eq("id", id);
    setOcupado("");
    if (e1 || e2) return setAviso(`No se pudo aprobar: ${(e1 ?? e2)?.message}`);
    registrar("Aprobación de acceso", `Se autorizó a ${nombre} con rol ${rol}.`);
    setAviso(`Acceso aprobado para ${nombre} con rol ${rol}. Ya puede iniciar sesión.`);
    await recargar();
  }

  async function rechazar(id: string, nombre: string) {
    setOcupado(id);
    const { error } = await supabase.from("profiles").update({ estatus: "Rechazado" }).eq("id", id);
    setOcupado("");
    if (error) return setAviso(`No se pudo rechazar: ${error.message}`);
    registrar("Rechazo de acceso", `Se rechazó la solicitud de ${nombre}.`);
    setAviso(`Solicitud de ${nombre} rechazada.`);
    await recargar();
  }

  async function cambiarRol(id: string, nombre: string, rol: Rol) {
    setOcupado(id);
    await supabase.from("user_roles").delete().eq("user_id", id);
    const { error } = await supabase.from("user_roles").insert({ user_id: id, role: rol });
    setOcupado("");
    if (error) return setAviso(`No se pudo cambiar el rol: ${error.message}`);
    registrar("Cambio de rol", `${nombre} ahora tiene el rol ${rol}.`);
    setAviso(`${nombre} ahora es ${rol}.`);
    await recargar();
  }

  async function cambiarEstatus(id: string, nombre: string, estatus: string) {
    setOcupado(id);
    const { error } = await supabase.from("profiles").update({ estatus }).eq("id", id);
    setOcupado("");
    if (error) return setAviso(`No se pudo actualizar: ${error.message}`);
    registrar("Estatus de usuario", `${nombre} quedó en estatus ${estatus}.`);
    setAviso(`${nombre} quedó en estatus ${estatus}.`);
    await recargar();
  }

  function guardarTope(ev: React.FormEvent) {
    ev.preventDefault();
    const valor = Number(tope);
    if (!Number.isFinite(valor) || valor <= 0)
      return setAviso("El tope debe ser un monto mayor a cero.");
    setEstado((e) => ({ ...e, topeSinComprobante: valor }));
    registrar("Configuración", `Tope de gastos sin comprobante fijado en ${mxn(valor)}.`);
    setAviso(`Tope sin factura actualizado a ${mxn(valor)}.`);
  }

  return (
    <div className="grid gap-4 pt-4">
      {aviso ? <Aviso>{aviso}</Aviso> : null}

      <Panel>
        <TituloPanel sub="Personas que solicitaron acceso y esperan tu autorización y rol.">
          Solicitudes de acceso{" "}
          {solicitudes.length ? <Etiqueta tono="alerta">{solicitudes.length}</Etiqueta> : null}
        </TituloPanel>
        {solicitudes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay solicitudes pendientes.</p>
        ) : (
          <Tabla cabeceras={["Nombre", "Correo", "Rol a asignar", "Acciones"]}>
            {solicitudes.map((p) => (
              <tr key={p.id}>
                <Celda>{p.nombre}</Celda>
                <Celda>{p.email}</Celda>
                <Celda>
                  <Selector
                    aria-label={`Rol para ${p.nombre}`}
                    value={rolSolicitud[p.id] ?? "Comisionado"}
                    onChange={(e) =>
                      setRolSolicitud((r) => ({ ...r, [p.id]: e.target.value as Rol }))
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </Selector>
                </Celda>
                <Celda>
                  <div className="flex flex-wrap gap-2">
                    <Boton
                      type="button"
                      disabled={ocupado === p.id}
                      onClick={() => void aprobar(p.id, p.nombre)}
                    >
                      Aprobar
                    </Boton>
                    <Boton
                      type="button"
                      variante="neutro"
                      disabled={ocupado === p.id}
                      onClick={() => void rechazar(p.id, p.nombre)}
                    >
                      Rechazar
                    </Boton>
                  </div>
                </Celda>
              </tr>
            ))}
          </Tabla>
        )}
      </Panel>

      <Panel>
        <TituloPanel sub="Usuarios autorizados y su rol dentro del proceso de comprobación.">
          Usuarios
        </TituloPanel>
        <Tabla cabeceras={["Nombre", "Correo", "Rol", "Estatus", "Acción"]}>
          {autorizados.map((p) => (
            <tr key={p.id}>
              <Celda>{p.nombre}</Celda>
              <Celda>{p.email}</Celda>
              <Celda>
                <Selector
                  aria-label={`Rol de ${p.nombre}`}
                  value={p.rol ?? "Comisionado"}
                  disabled={p.id === usuarioActual.id}
                  onChange={(e) => void cambiarRol(p.id, p.nombre, e.target.value as Rol)}
                >
                  {ROLES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </Selector>
              </Celda>
              <Celda>
                <Etiqueta tono={p.estatus === "Aprobado" ? "ok" : "neutro"}>{p.estatus}</Etiqueta>
              </Celda>
              <Celda>
                {p.id === usuarioActual.id ? (
                  <span className="text-sm text-muted-foreground">Sesión actual</span>
                ) : (
                  <Boton
                    type="button"
                    variante="neutro"
                    disabled={ocupado === p.id}
                    onClick={() =>
                      void cambiarEstatus(
                        p.id,
                        p.nombre,
                        p.estatus === "Aprobado" ? "Rechazado" : "Aprobado",
                      )
                    }
                  >
                    {p.estatus === "Aprobado" ? "Suspender" : "Reactivar"}
                  </Boton>
                )}
              </Celda>
            </tr>
          ))}
        </Tabla>
      </Panel>

      <Panel>
        <TituloPanel sub="Envía un correo de prueba para confirmar que el dominio de notificaciones entrega correctamente.">
          Correo de prueba
        </TituloPanel>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const correo = correoPrueba.trim();
            if (!correo) return setAviso("Indica el correo del destinatario.");
            setOcupado("correo");
            setAviso("");
            try {
              const res = await enviarCorreoPrueba({
                data: { destinatario: correo, nombre: usuarioActual.nombre },
              });
              setAviso(
                res.sent
                  ? `Correo de prueba enviado a ${correo}. Revisa la bandeja de entrada y spam.`
                  : `No se envió: ${correo} está en la lista de supresión (rebote o baja previa).`,
              );
            } catch (err) {
              setAviso(
                `Error al enviar: ${err instanceof Error ? err.message : "desconocido"}`,
              );
            } finally {
              setOcupado("");
            }
          }}
        >
          <Campo etiqueta="Correo del destinatario" id="correo-prueba">
            <Entrada
              id="correo-prueba"
              type="email"
              required
              placeholder="nombre@dominio.com"
              value={correoPrueba}
              onChange={(e) => setCorreoPrueba(e.target.value)}
              className="w-72"
            />
          </Campo>
          <Boton type="submit" disabled={ocupado === "correo"}>
            {ocupado === "correo" ? "Enviando…" : "Enviar correo de prueba"}
          </Boton>
        </form>
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
