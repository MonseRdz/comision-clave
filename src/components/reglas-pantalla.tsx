import { useState } from "react";
import { useStore, hoyISO, nuevoId, fechaHora } from "@/lib/store";
import { insertarAceptacion } from "@/lib/db";
import { REGLAS } from "@/lib/seed";
import { Panel, TituloPanel, Boton, Aviso, Etiqueta } from "@/components/glass";

export function ReglasPantalla() {
  const { estado, setEstado, registrar, usuarioActual } = useStore();
  const aceptacion = estado.aceptaciones.find(
    (a) => a.usuarioId === usuarioActual.id && a.version === estado.versionReglas,
  );

  const [error, setError] = useState("");

  async function aceptar() {
    const registro = {
      id: nuevoId("ac"),
      usuarioId: usuarioActual.id,
      fecha: hoyISO(),
      version: estado.versionReglas,
    };
    try {
      const guardado = await insertarAceptacion(registro);
      setEstado((e) => ({ ...e, aceptaciones: [...e.aceptaciones, guardado] }));
      await registrar(
        "Aceptación de reglas",
        `${usuarioActual.nombre} aceptó las reglas institucionales ${estado.versionReglas} el ${fechaHora(guardado.fecha)}.`,
      );
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="mx-auto max-w-3xl pt-4">
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <Panel>
        <TituloPanel sub={`Versión ${estado.versionReglas} · Lectura y aceptación obligatoria`}>
          Bienvenida, {usuarioActual.nombre}
        </TituloPanel>
        <p className="mb-4 text-sm">
          Antes de registrar comprobaciones debes leer y aceptar formalmente las reglas
          institucionales de ADEMEBA. Tu aceptación queda asentada en la bitácora inmutable con
          fecha, hora y versión.
        </p>
        <ol className="mb-5 list-decimal space-y-2 pl-5 text-sm">
          {REGLAS.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
        {aceptacion ? (
          <div className="flex flex-wrap items-center gap-3">
            <Etiqueta tono="ok">Reglas aceptadas</Etiqueta>
            <Aviso>
              Aceptadas el {fechaHora(aceptacion.fecha)} · versión {aceptacion.version}
            </Aviso>
          </div>
        ) : (
          <Boton onClick={aceptar}>Aceptar reglas y continuar</Boton>
        )}
      </Panel>
    </div>
  );
}
