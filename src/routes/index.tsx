import { createFileRoute } from "@tanstack/react-router";
import { useStore, mxn, diasDesde } from "@/lib/store";
import { Panel, TituloPanel, Etiqueta, Aviso, Tabla, Celda } from "@/components/glass";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tablero de gestión directiva | Comprobación de Gastos" },
      {
        name: "description",
        content:
          "Indicadores de presupuesto, antigüedad de pendientes, monto en riesgo y delegaciones vigentes.",
      },
      { property: "og:title", content: "Tablero de gestión directiva | Comprobación de Gastos" },
      {
        property: "og:description",
        content: "Vista de alto nivel del avance de comprobación y semáforo de auditoría.",
      },
    ],
  }),
  component: Tablero,
});

function Indicador({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-xl border-2 border-border-strong bg-glass-strong p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-2xl font-black">{valor}</p>
      {nota ? <p className="text-xs text-muted-foreground">{nota}</p> : null}
    </div>
  );
}

function Tablero() {
  const { estado } = useStore();
  const pendiente = (e: string) => e !== "Aprobado" && e !== "Rechazado";

  const asignado = estado.presupuestos.reduce((s, p) => s + p.monto, 0);
  const comprobado = estado.gastos
    .filter((g) => g.estatus !== "Rechazado")
    .reduce((s, g) => s + g.montoMXN, 0);
  const disponible = asignado - comprobado;
  const pct = asignado ? Math.round((comprobado / asignado) * 100) : 0;

  const pendientes = estado.gastos.filter((g) => pendiente(g.estatus));
  const bucket = (min: number, max: number) =>
    pendientes.filter((g) => diasDesde(g.creadoEn) >= min && diasDesde(g.creadoEn) <= max);
  const menos3 = bucket(0, 2);
  const tres7 = bucket(3, 7);
  const mas7 = pendientes.filter((g) => diasDesde(g.creadoEn) > 7);
  const enRiesgo = mas7.reduce((s, g) => s + g.montoMXN, 0);

  const vigentes = estado.delegaciones.filter((d) => {
    const hoy = new Date().toISOString().slice(0, 10);
    return d.estatus === "Vigente" && d.fechaInicio <= hoy && d.fechaFin >= hoy;
  });

  return (
    <div className="grid gap-4 pt-4">
      <Panel>
        <TituloPanel sub="Indicadores financieros y de cumplimiento en tiempo real.">
          Tablero de gestión directiva
        </TituloPanel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Indicador titulo="Presupuesto total asignado" valor={mxn(asignado)} />
          <Indicador titulo="Comprobado" valor={mxn(comprobado)} nota={`${pct}% del total asignado`} />
          <Indicador titulo="Disponible" valor={mxn(disponible)} />
          <Indicador titulo="Monto en riesgo (+7 días)" valor={mxn(enRiesgo)} nota={`${mas7.length} comprobaciones`} />
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <TituloPanel sub="Comprobaciones pendientes de dictamen por antigüedad.">
            Antigüedad de pendientes
          </TituloPanel>
          <div className="grid gap-3 sm:grid-cols-3">
            <Indicador titulo="Menos de 3 días" valor={String(menos3.length)} />
            <Indicador titulo="Entre 3 y 7 días" valor={String(tres7.length)} />
            <Indicador titulo="Más de 7 días" valor={String(mas7.length)} />
          </div>
        </Panel>

        <Panel>
          <TituloPanel sub="Facultades de aprobación delegadas por el Contralor.">
            Delegaciones vigentes
          </TituloPanel>
          {vigentes.length ? (
            vigentes.map((d) => (
              <Aviso key={d.folio} tono="alerta">
                Delegación Activa {d.folio}: {estado.usuarios.find((u) => u.id === d.deId)?.nombre} →{" "}
                {estado.usuarios.find((u) => u.id === d.paraId)?.nombre} ({d.fechaInicio} a {d.fechaFin}) ·{" "}
                {d.motivo}
              </Aviso>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sin delegaciones vigentes.</p>
          )}
        </Panel>
      </div>

      <Panel>
        <TituloPanel sub="Verde: todo dictaminado. Amarillo: comprobaciones pendientes. Rojo: gastos rechazados o presupuesto excedido.">
          Semáforo de auditoría por evento
        </TituloPanel>
        <Tabla cabeceras={["Evento", "Clave", "Asignado", "Comprobado", "Disponible", "% comprobado", "Semáforo"]}>
          {estado.eventos.map((ev) => {
            const asig = estado.presupuestos.filter((p) => p.eventoId === ev.id).reduce((s, p) => s + p.monto, 0);
            const gastosEv = estado.gastos.filter((g) => g.eventoId === ev.id);
            const comp = gastosEv.filter((g) => g.estatus !== "Rechazado").reduce((s, g) => s + g.montoMXN, 0);
            const pend = gastosEv.filter((g) => pendiente(g.estatus));
            const rojo = comp > asig || gastosEv.some((g) => g.estatus === "Rechazado");
            const tono = rojo ? "error" : pend.length ? "alerta" : "ok";
            const texto = rojo ? "Rojo" : pend.length ? "Amarillo" : "Verde";
            return (
              <tr key={ev.id}>
                <Celda>{ev.nombre}</Celda>
                <Celda>{ev.clave}</Celda>
                <Celda>{mxn(asig)}</Celda>
                <Celda>{mxn(comp)}</Celda>
                <Celda>{mxn(asig - comp)}</Celda>
                <Celda>{asig ? Math.round((comp / asig) * 100) : 0}%</Celda>
                <Celda>
                  <Etiqueta tono={tono}>
                    {texto} · {pend.length} pendientes
                  </Etiqueta>
                </Celda>
              </tr>
            );
          })}
        </Tabla>
      </Panel>
    </div>
  );
}
