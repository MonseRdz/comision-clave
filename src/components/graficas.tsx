import type { ReactNode } from "react";
import { mxn } from "@/lib/store";

/** Un segmento de una barra apilada. */
export type Segmento = {
  etiqueta: string;
  valor: number;
  color: string;
  /** Texto dentro del segmento en color oscuro (para el segmento sin comprobar). */
  textoOscuro?: boolean;
  /** Segmento sin relleno: borde punteado y trama diagonal. */
  hueco?: boolean;
};

export function VacioGrafica({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function LeyendaGrafica({
  items,
}: {
  items: { etiqueta: string; color?: string; hueco?: boolean; linea?: boolean }[];
}) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
      {items.map((i) => (
        <li key={i.etiqueta} className="flex items-center gap-1.5 text-xs text-ink-2">
          {i.linea ? (
            <span className="inline-block h-3 w-0.5" style={{ background: i.color }} />
          ) : (
            <span
              className="inline-block h-3 w-3 rounded-[3px]"
              style={
                i.hueco
                  ? {
                      border: "1.5px dashed var(--ink-3)",
                      backgroundImage:
                        "repeating-linear-gradient(45deg, var(--track) 0 3px, transparent 3px 6px)",
                    }
                  : { background: i.color }
              }
            />
          )}
          {i.etiqueta}
        </li>
      ))}
    </ul>
  );
}

/** Barra apilada horizontal con nombre y cifra encima. */
export function BarraApilada({
  nombre,
  cifra,
  segmentos,
  alto = 22,
  conTextoInterno = false,
}: {
  nombre: string;
  cifra: string;
  segmentos: Segmento[];
  alto?: number;
  conTextoInterno?: boolean;
}) {
  const total = segmentos.reduce((s, x) => s + Math.max(0, x.valor), 0) || 1;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs text-ink-3">
        <span className="truncate">{nombre}</span>
        <span className="cifra shrink-0">{cifra}</span>
      </div>
      <div className="mt-1 flex gap-[2px]" style={{ height: alto }}>
        {segmentos
          .filter((s) => s.valor > 0)
          .map((s) => {
            const pct = (s.valor / total) * 100;
            return (
              <div
                key={s.etiqueta}
                title={`${s.etiqueta}: ${mxn(s.valor)}`}
                className="flex flex-col items-center justify-center overflow-hidden rounded-[5px] px-1 text-center leading-tight"
                style={{
                  width: `${pct}%`,
                  background: s.color,
                  color: s.textoOscuro ? "var(--ink-2)" : "#fff",
                }}
              >
                {conTextoInterno && pct > 12 ? (
                  <>
                    <span className="cifra text-xs font-bold">{mxn(s.valor)}</span>
                    <span className="text-[10px]">{s.etiqueta}</span>
                  </>
                ) : null}
              </div>
            );
          })}
      </div>
    </div>
  );
}

/** Barra simple horizontal, ancho proporcional a un máximo. */
export function BarraSimple({
  nombre,
  sub,
  cifra,
  valor,
  maximo,
  color,
  hueco = false,
  titulo,
}: {
  nombre: string;
  /** Texto secundario en letra chica debajo del nombre (p. ej. el rol). */
  sub?: string;
  cifra: string;
  valor: number;
  maximo: number;
  color: string;
  hueco?: boolean;
  titulo?: string;
}) {
  const pct = maximo > 0 ? Math.max(2, (valor / maximo) * 100) : 2;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs text-ink-3">
        <span className="truncate">
          {nombre}
          {sub ? <span className="block text-[10px] text-ink-3/80">{sub}</span> : null}
        </span>
        <span className="cifra shrink-0">{cifra}</span>
      </div>
      <div className="mt-1" style={{ height: 22 }}>
        <div
          title={titulo ?? `${nombre}: ${cifra}`}
          className="h-full rounded-[5px]"
          style={
            hueco
              ? {
                  width: `${pct}%`,
                  border: "1.5px dashed var(--ink-3)",
                  backgroundImage:
                    "repeating-linear-gradient(45deg, var(--track) 0 4px, transparent 4px 8px)",
                }
              : { width: `${pct}%`, background: color }
          }
        />
      </div>
    </div>
  );
}

/** Carril proporcional al asignado, relleno proporcional a lo comprobado y marca del asignado. */
export function BarraCarril({
  nombre,
  cifra,
  comprobado,
  asignado,
  maximoAsignado,
}: {
  nombre: string;
  cifra: string;
  comprobado: number;
  asignado: number;
  maximoAsignado: number;
}) {
  const anchoCarril = maximoAsignado > 0 ? Math.max(4, (asignado / maximoAsignado) * 100) : 4;
  const relleno = asignado > 0 ? Math.min(100, (comprobado / asignado) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs text-ink-3">
        <span className="truncate">{nombre}</span>
        <span className="cifra shrink-0">{cifra}</span>
      </div>
      <div className="mt-1" style={{ height: 22 }}>
        <div
          className="relative h-full rounded-[5px]"
          style={{ width: `${anchoCarril}%`, background: "var(--track)" }}
          title={`${nombre}: ${mxn(comprobado)} de ${mxn(asignado)}`}
        >
          <div
            className="h-full rounded-[5px]"
            style={{ width: `${relleno}%`, background: "var(--dato)" }}
          />
          <span
            className="absolute inset-y-0 right-0 w-[2px]"
            style={{ background: "var(--ink)" }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
