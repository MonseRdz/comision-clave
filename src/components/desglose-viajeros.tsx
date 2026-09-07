import { mxn, useStore } from "@/lib/store";
import { comprobadoDe, desgloseViajeros, esGastoTransporte, pendienteDe, tieneFactura } from "@/lib/transporte";
import type { Gasto } from "@/lib/types";
import { Etiqueta } from "@/components/glass";

/** Resumen prominente de comprobado vs. pendiente de un gasto. */
export function ResumenComprobacion({
  comprobado,
  pendiente,
  total,
}: {
  comprobado: number;
  pendiente: number;
  total: number;
}) {
  return (
    <div className="grid gap-2 rounded-md border-2 border-border-strong bg-glass-strong p-3 sm:grid-cols-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Comprobado</p>
        <p className="cifra text-lg font-bold text-success">{mxn(comprobado)}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Pendiente de comprobar</p>
        <p className="cifra text-lg font-bold text-warning">{mxn(pendiente)}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Total del gasto</p>
        <p className="cifra text-lg font-bold">{mxn(total)}</p>
        <p className="text-xs text-muted-foreground">
          {mxn(comprobado)} + {mxn(pendiente)}
        </p>
      </div>
    </div>
  );
}

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
      <div className="mt-2">
        <ResumenComprobacion
          comprobado={comprobadoDe(gasto)}
          pendiente={pendienteDe(gasto)}
          total={gasto.montoMXN}
        />
      </div>
      {!conFactura ? (
        <p className="mt-2 text-xs font-semibold text-warning">
          Sin factura que ampare el total: todo el gasto queda pendiente de comprobar.
        </p>
      ) : null}
      <ul className="mt-2 grid gap-1 text-xs">
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
    </div>
  );
}

