import { useState } from "react";
import { mxn, useStore } from "@/lib/store";
import { actualizarGasto } from "@/lib/db";
import { faltantesDe, saldoSinDestino, saldoSinEvidencia } from "@/lib/documentacion";
import type { Documentacion, Gasto } from "@/lib/types";
import { Aviso, Boton, Campo, Entrada, Selector } from "@/components/glass";

/**
 * Acción posterior a la aprobación: el saldo pendiente por comprobar nunca
 * puede quedarse sin destino. O se envía a documentación con responsable y
 * fecha compromiso obligatoria, o se marca como reintegro.
 * Solo la ve quien dictamina (Contralor o Director con delegación vigente).
 */
export function EnviarSaldoDocumentacion({ gasto }: { gasto: Gasto }) {
  const { estado, usuarioActual, puedeAprobar, aplicarGasto, registrar } = useStore();
  const [form, setForm] = useState({ responsableId: gasto.comisionadoId, fecha: "" });
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);

  if (!puedeAprobar || !saldoSinDestino(gasto)) return null;

  const saldo = saldoSinEvidencia(gasto);
  const nombreDe = (id: string) => estado.usuarios.find((u) => u.id === id)?.nombre ?? "—";
  const nominalDe = (id: string) =>
    estado.eventos.find((e) => e.id === gasto.eventoId)?.participantes.find((p) => p.id === id)
      ?.nombre ?? id;

  const base = (estatus: Documentacion["estatus"]): Documentacion => ({
    estatus,
    monto: saldo,
    montoInicial: saldo,
    responsableId: form.responsableId || gasto.comisionadoId,
    fechaCompromiso: form.fecha,
    creadoEn: new Date().toISOString(),
    creadoPor: usuarioActual.id,
    cierres: [],
  });

  async function guardar(documentacion: Documentacion, accion: string, texto: string) {
    setGuardando(true);
    try {
      const guardado = await actualizarGasto(gasto.id, { documentacion });
      aplicarGasto(guardado);
      await registrar(accion, texto);
      setError("");
      setAviso(texto);
    } catch (err: unknown) {
      setAviso("");
      setError(err instanceof Error ? err.message : String(err));
    }
    setGuardando(false);
  }

  async function enviar() {
    if (!form.responsableId) return setError("Selecciona a quién se le asigna el saldo.");
    if (!form.fecha) return setError("La fecha compromiso es obligatoria para enviar el saldo.");
    await guardar(
      base("Abierto"),
      "Saldo enviado a documentación",
      `Gasto de ${gasto.proveedor}: ${usuarioActual.nombre} envió ${mxn(saldo)} a documentación, asignados a ${nombreDe(
        form.responsableId,
      )} con fecha compromiso ${form.fecha}. El monto del gasto (${mxn(gasto.montoMXN)}) y lo ya aprobado no cambian.`,
    );
  }

  async function marcarReintegro() {
    if (
      !window.confirm(
        `¿Marcar ${mxn(saldo)} como reintegro? El saldo dejará de esperar evidencia y quedará señalado para su devolución.`,
      )
    )
      return;
    const doc = base("Reintegro");
    await guardar(
      {
        ...doc,
        fechaCompromiso: form.fecha || new Date().toISOString().slice(0, 10),
        reintegro: { fecha: new Date().toISOString(), monto: saldo, actorId: usuarioActual.id },
      },
      "Saldo marcado como reintegro",
      `Gasto de ${gasto.proveedor}: ${usuarioActual.nombre} marcó ${mxn(saldo)} del saldo pendiente como reintegro.`,
    );
  }

  return (
    <div className="mt-2 grid gap-2 rounded-md border-2 border-border-strong bg-glass-strong p-2">
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {aviso ? <Aviso>{aviso}</Aviso> : null}
      <p className="text-xs">
        Saldo pendiente por comprobar: <strong className="text-warning">{mxn(saldo)}</strong> de{" "}
        {mxn(gasto.montoMXN)}. Falta la evidencia de:{" "}
        {faltantesDe(gasto)
          .map((v) => `${nominalDe(v.participanteId)} (${v.falta})`)
          .join(", ") || "el total del gasto"}
        . Este saldo no puede quedarse sin destino.
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        <Campo etiqueta="Se asigna a" id={`env-resp-${gasto.id}`}>
          <Selector
            id={`env-resp-${gasto.id}`}
            value={form.responsableId}
            onChange={(e) => setForm({ ...form, responsableId: e.target.value })}
          >
            {estado.usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} ({u.rol})
              </option>
            ))}
          </Selector>
        </Campo>
        <Campo etiqueta="Fecha compromiso (obligatoria)" id={`env-fecha-${gasto.id}`}>
          <Entrada
            id={`env-fecha-${gasto.id}`}
            type="date"
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
          />
        </Campo>
      </div>
      <div className="flex flex-wrap gap-2">
        <Boton type="button" onClick={() => void enviar()} disabled={guardando}>
          Enviar el saldo a documentación
        </Boton>
        <Boton
          type="button"
          variante="neutro"
          onClick={() => void marcarReintegro()}
          disabled={guardando}
        >
          Marcar el saldo como reintegro
        </Boton>
      </div>
    </div>
  );
}
