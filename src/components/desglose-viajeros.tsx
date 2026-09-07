import { mxn, useStore } from "@/lib/store";
import { comprobadoDe, desgloseViajeros, esGastoTransporte, pendienteDe, tieneFactura } from "@/lib/transporte";
import type { Gasto } from "@/lib/types";
import { Etiqueta } from "@/components/glass";

/** Desglose por viajero de un gasto de Transporte: importe, pases y pendiente. */
export function DesgloseViajeros({ gasto }: { gasto: Gasto }) {
  const { estado } = useStore();
  if (!esGastoTransporte(gasto)) return null;
  const filas = desgloseViajeros(gasto);
  if (!filas.length) return null;
  const nominales = estado.eventos.find((e) => e.id === gasto.eventoId)?.participantes ?? [];
  const conFactura = tieneFactura(gasto);

  return (
    <div className="mt-2 rounded-md border-2 border-border-strong p-2">
      <p className="text-sm font-semibold">Comprobación por viajero</p>
      {!conFactura ? (
        <p className="text-xs font-semibold text-warning">
          Sin factura que ampare el total: todo el gasto queda pendiente de comprobar.
        </p>
      ) : null}
      <ul className="mt-1 grid gap-1 text-xs">
        {filas.map((v) => (
          <li key={v.participanteId} className="flex flex-wrap items-center gap-2">
            <span className="min-w-40 flex-1">
              {nominales.find((p) => p.id === v.participanteId)?.nombre ?? v.participanteId}
            </span>
            <span className="cifra font-semibold">{mxn(v.importe)}</span>
            <Etiqueta tono={v.ida ? "ok" : "alerta"}>{v.ida ? "Ida ✓" : "Falta ida"}</Etiqueta>
            <Etiqueta tono={v.regreso ? "ok" : "alerta"}>
              {v.regreso ? "Regreso ✓" : "Falta regreso"}
            </Etiqueta>
            {v.pendiente > 0 ? (
              <span className="font-semibold text-warning">Pendiente {mxn(v.pendiente)}</span>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs">
        Comprobado: <strong>{mxn(comprobadoDe(gasto))}</strong> · Pendiente de comprobar:{" "}
        <strong>{mxn(pendienteDe(gasto))}</strong> de {mxn(gasto.montoMXN)}
      </p>
    </div>
  );
}
