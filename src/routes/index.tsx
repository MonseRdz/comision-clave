import { createFileRoute } from "@tanstack/react-router";
import {
  useStore,
  mxn,
  diasDesde,
  cuentaComprobado,
  cuentaEnDictamen,
  estaPendiente,
  esBorrador,
} from "@/lib/store";
import { Panel, TituloPanel, Etiqueta, Aviso, Tabla, Celda } from "@/components/glass";
import { resta, suma } from "@/lib/dinero";
import {
  BarraApilada,
  BarraCarril,
  BarraSimple,
  LeyendaGrafica,
  VacioGrafica,
} from "@/components/graficas";
import { DIAS_DEVUELTO, DIAS_EN_DICTAMEN, MAX_ATENCION, PCT_MINIMO_RUBRO } from "@/lib/umbrales";
import { resumenSinFactura } from "@/lib/sin-factura";


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
    <div className="rounded-[12px] border border-hair bg-card p-4 shadow-[0_1px_2px_rgba(16,24,32,.045)]">
      <p className="titulo-tarjeta text-xs text-ink-2">{titulo}</p>
      <p className="cifra mt-1 text-2xl font-black">{valor}</p>
      {nota ? <p className="text-xs text-ink-3">{nota}</p> : null}
    </div>
  );
}

function Tablero() {
  const { estado } = useStore();

  const asignado = estado.presupuestos.reduce((s, p) => suma(s, p.monto), 0);
  const comprobado = estado.gastos
    .filter(cuentaComprobado)
    .reduce((s, g) => suma(s, g.montoMXN), 0);
  const disponible = resta(asignado, comprobado);
  const pct = asignado ? Math.round((comprobado / asignado) * 100) : 0;

  const pendientes = estado.gastos.filter(estaPendiente);
  const bucket = (min: number, max: number) =>
    pendientes.filter((g) => diasDesde(g.creadoEn) >= min && diasDesde(g.creadoEn) <= max);
  const menos3 = bucket(0, 2);
  const tres7 = bucket(3, 7);
  const mas7 = pendientes.filter((g) => diasDesde(g.creadoEn) > 7);
  const enRiesgo = mas7.reduce((s, g) => suma(s, g.montoMXN), 0);

  const vigentes = estado.delegaciones.filter((d) => {
    const hoy = new Date().toISOString().slice(0, 10);
    return d.estatus === "Vigente" && d.fechaInicio <= hoy && d.fechaFin >= hoy;
  });

  // Composición del presupuesto ejercido (sin borradores).
  const noBorrador = estado.gastos.filter((g) => !esBorrador(g));
  const aprobadoTotal = comprobado;
  const dictamenTotal = noBorrador
    .filter(cuentaEnDictamen)
    .reduce((s, g) => suma(s, g.montoMXN), 0);
  const sinComprobar = Math.max(0, resta(resta(asignado, aprobadoTotal), dictamenTotal));

  // 7.2 Etapas del flujo.
  const etapas = [
    { clave: "Borrador", etiqueta: "Borrador (aún con el comisionado)", color: "var(--track)", hueco: true },
    { clave: "Registrado", etiqueta: "Registrado · espera Revisor", color: "var(--estado-azul)", hueco: false },
    { clave: "Validado por Revisor", etiqueta: "Validado · espera Contralor", color: "var(--estado-ambar)", hueco: false },
    { clave: "Devuelto para corrección", etiqueta: "Devuelto para corrección", color: "var(--estado-rojo)", hueco: false },
    { clave: "Aprobado", etiqueta: "Aprobado", color: "var(--estado-verde)", hueco: false },
  ].map((e) => {
    const gs = estado.gastos.filter((g) => g.estatus === e.clave);
    return { ...e, n: gs.length, monto: gs.reduce((s, g) => suma(s, g.montoMXN), 0) };
  });
  const maxEtapa = Math.max(...etapas.map((e) => e.n), 0);

  // 7.3 Concentración por comisionado (monto pendiente de dictamen).
  // Se agrupa por comisionadoId del gasto, sin filtrar por rol: quien ejerció
  // el recurso es el comisionado del gasto, tenga el rol que tenga.
  const porComisionado = [...new Set(pendientes.map((g) => g.comisionadoId))]
    .map((id) => {
      const gs = pendientes.filter((g) => g.comisionadoId === id);
      const monto = gs.reduce((s, g) => suma(s, g.montoMXN), 0);
      const dias = gs.length ? Math.max(...gs.map((g) => diasDesde(g.creadoEn))) : 0;
      const u = estado.usuarios.find((x) => x.id === id);
      return { id, nombre: u?.nombre ?? "Sin identificar", rol: u?.rol ?? "", monto, dias };
    })
    .filter((x) => x.monto > 0)
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 8);
  const maxComisionado = Math.max(...porComisionado.map((c) => c.monto), 0);

  // 7.4 Rubros.
  const rubros = [...new Set(estado.presupuestos.map((p) => p.rubro))].map((r) => {
    const asig = estado.presupuestos.filter((p) => p.rubro === r).reduce((s, p) => suma(s, p.monto), 0);
    const comp = noBorrador
      .filter((g) => g.rubro === r && cuentaComprobado(g))
      .reduce((s, g) => suma(s, g.montoMXN), 0);
    return { rubro: r, asig, comp, pct: asig ? Math.round((comp / asig) * 100) : 0 };
  });
  const maxRubro = Math.max(...rubros.map((r) => r.asig), 0);

  // 8. Requieren tu atención hoy.
  type Fila = { id: string; tono: string; pildora: string; titulo: string; detalle: string; monto: string; dias: number };
  const filasAtencion: Fila[] = [];
  const ordenPorDias = (a: Fila, b: Fila) => b.dias - a.dias;

  const g1 = noBorrador
    .filter((g) => g.estatus === "Devuelto para corrección" && diasDesde(g.creadoEn) > DIAS_DEVUELTO)
    .map<Fila>((g) => ({
      id: `d${g.id}`,
      tono: "var(--estado-rojo)",
      pildora: `${diasDesde(g.creadoEn)} días`,
      titulo: `${g.proveedor} · ${g.rubro}`,
      detalle: "Devuelto para corrección sin movimiento",
      monto: mxn(g.montoMXN),
      dias: diasDesde(g.creadoEn),
    }))
    .sort(ordenPorDias);

  const g2 = noBorrador
    .filter(
      (g) =>
        (g.estatus === "Registrado" || g.estatus === "Validado por Revisor") &&
        diasDesde(g.creadoEn) > DIAS_EN_DICTAMEN,
    )
    .map<Fila>((g) => ({
      id: `r${g.id}`,
      tono: "var(--estado-rojo)",
      pildora: `${diasDesde(g.creadoEn)} días`,
      titulo: `${g.proveedor} · ${g.rubro}`,
      detalle: g.estatus,
      monto: mxn(g.montoMXN),
      dias: diasDesde(g.creadoEn),
    }))
    .sort(ordenPorDias);

  const g3 = rubros
    .filter((r) => r.pct < PCT_MINIMO_RUBRO)
    .map<Fila>((r) => ({
      id: `u${r.rubro}`,
      tono: "var(--estado-ambar)",
      pildora: "Rubro",
      titulo: r.rubro,
      detalle: `${r.pct}% comprobado de ${mxn(r.asig)}`,
      monto: mxn(r.comp),
      dias: 0,
    }));

  const g4 = noBorrador
    .filter((g) => g.moneda !== "MXN" && Number(g.tipoCambio) === 1)
    .map<Fila>((g) => ({
      id: `t${g.id}`,
      tono: "var(--estado-ambar)",
      pildora: "Tipo de cambio",
      titulo: `${g.proveedor} · ${g.moneda}`,
      detalle: "Tipo de cambio pendiente de capturar",
      monto: mxn(g.montoMXN),
      dias: diasDesde(g.creadoEn),
    }))
    .sort(ordenPorDias);

  filasAtencion.push(...g1, ...g2, ...g3, ...g4);
  const atencion = filasAtencion.slice(0, MAX_ATENCION);

  const sumaEscrita = `Aprobado ${mxn(aprobadoTotal)} + En dictamen ${mxn(dictamenTotal)} + Sin comprobar ${mxn(sinComprobar)} = ${mxn(asignado)} de presupuesto asignado.`;

  // Comprobación sin factura: indicador de observación, sin umbral definido.
  const sinFactura = resumenSinFactura(estado.gastos);
  const sinFacturaEventos = estado.eventos
    .map((ev) => {
      const r = resumenSinFactura(estado.gastos.filter((g) => g.eventoId === ev.id));
      return { id: ev.id, nombre: ev.nombre, monto: r.monto, pct: r.pct };
    })
    .filter((x) => x.monto > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  return (
    <div className="grid gap-4 pt-4">
      <Panel>
        <TituloPanel icono="i-score" sub="Indicadores financieros y de cumplimiento en tiempo real.">
          Tablero de gestión directiva
        </TituloPanel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Indicador titulo="Presupuesto total asignado" valor={mxn(asignado)} />
          <Indicador
            titulo="Comprobado y aprobado"
            valor={mxn(comprobado)}
            nota={`${pct}% del total asignado`}
          />
          <Indicador
            titulo="Pendiente de comprobar"
            valor={mxn(disponible)}
            nota={
              dictamenTotal > 0
                ? `Incluye ${mxn(dictamenTotal)} en dictamen`
                : "Presupuesto sin respaldo documental"
            }
          />
          <Indicador
            titulo="Monto en riesgo (+7 días)"
            valor={mxn(enRiesgo)}
            nota={`${mas7.length} ${mas7.length === 1 ? "comprobación" : "comprobaciones"}`}
          />
        </div>

        <div className="mt-6">
          <TituloPanel icono="i-ball">Composición del presupuesto ejercido</TituloPanel>
          {asignado > 0 ? (
            <div>
              <BarraApilada
                nombre="Presupuesto asignado"
                cifra={mxn(asignado)}
                alto={38}
                conTextoInterno
                segmentos={[
                  { etiqueta: "Aprobado", valor: aprobadoTotal, color: "var(--estado-verde)" },
                  { etiqueta: "En dictamen", valor: dictamenTotal, color: "var(--estado-ambar)" },
                  { etiqueta: "Sin comprobar", valor: sinComprobar, color: "var(--track)", textoOscuro: true },
                ]}
              />
              <div
                className="mt-2 ml-auto border-x border-b border-ink-3 pt-1"
                style={{
                  width: `${asignado ? Math.min(100, ((dictamenTotal + sinComprobar) / asignado) * 100) : 0}%`,
                  height: 8,
                }}
                aria-hidden="true"
              />
              <p className="mt-1 text-center text-xs text-ink-2">
                Pendiente de comprobar · {mxn(suma(dictamenTotal, sinComprobar))}
              </p>
              <p className="mt-2 text-xs text-ink-3">{sumaEscrita}</p>
            </div>
          ) : (
            <VacioGrafica>La gráfica aparecerá cuando haya presupuesto asignado.</VacioGrafica>
          )}
        </div>
      </Panel>

      <Panel>
        <TituloPanel icono="i-clock" sub="Ordenado por urgencia, no por monto.">
          Requieren tu atención hoy
        </TituloPanel>
        {atencion.length ? (
          <ul className="grid gap-2">
            {atencion.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center gap-3 rounded-[12px] border border-hair bg-card px-3 py-2"
              >
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                  style={{ background: f.tono }}
                >
                  {f.pildora}
                </span>
                <span className="min-w-40 flex-1">
                  <span className="block text-sm font-semibold">{f.titulo}</span>
                  <span className="block text-xs text-ink-3">{f.detalle}</span>
                </span>
                <span className="cifra text-sm font-bold">{f.monto}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Sin pendientes que requieran atención hoy.</p>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <TituloPanel icono="i-court" sub="Cómo va cada evento contra su presupuesto asignado.">
            Avance de comprobación por evento
          </TituloPanel>
          {estado.eventos.length && asignado > 0 ? (
            <>
              <LeyendaGrafica
                items={[
                  { etiqueta: "Aprobado", color: "var(--estado-verde)" },
                  { etiqueta: "En dictamen", color: "var(--estado-ambar)" },
                  { etiqueta: "Pendiente", color: "var(--track)" },
                ]}
              />
              <div className="grid gap-3">
                {estado.eventos.map((ev) => {
                  const asig = estado.presupuestos
                    .filter((p) => p.eventoId === ev.id)
                    .reduce((s, p) => suma(s, p.monto), 0);
                  const gs = estado.gastos.filter((g) => g.eventoId === ev.id && !esBorrador(g));
                  const apro = gs.filter((g) => g.estatus === "Aprobado").reduce((s, g) => suma(s, g.montoMXN), 0);
                  const dict = gs.filter(cuentaEnDictamen).reduce((s, g) => suma(s, g.montoMXN), 0);
                  const comp = gs.filter(cuentaComprobado).reduce((s, g) => suma(s, g.montoMXN), 0);
                  const rest = Math.max(0, resta(resta(asig, apro), dict));
                  return (
                    <BarraApilada
                      key={ev.id}
                      nombre={ev.nombre}
                      cifra={`${asig ? Math.round((comp / asig) * 100) : 0}% · ${mxn(comp)} de ${mxn(asig)}`}
                      segmentos={[
                        { etiqueta: "Aprobado", valor: apro, color: "var(--estado-verde)" },
                        { etiqueta: "En dictamen", valor: dict, color: "var(--estado-ambar)" },
                        { etiqueta: "Pendiente", valor: rest, color: "var(--track)", textoOscuro: true },
                      ]}
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <VacioGrafica>La gráfica aparecerá cuando haya presupuesto asignado.</VacioGrafica>
          )}
        </Panel>

        <Panel>
          <TituloPanel icono="i-whistle" sub="Comprobaciones por etapa del flujo de dictamen.">
            Dónde está detenido el proceso
          </TituloPanel>
          {estado.gastos.length ? (
            <>
              <LeyendaGrafica
                items={[
                  { etiqueta: "No cuenta al presupuesto", hueco: true },
                  { etiqueta: "Espera Revisor", color: "var(--estado-azul)" },
                  { etiqueta: "Espera Contralor", color: "var(--estado-ambar)" },
                  { etiqueta: "Con el comisionado", color: "var(--estado-rojo)" },
                  { etiqueta: "Cerrado", color: "var(--estado-verde)" },
                ]}
              />
              <div className="grid gap-3">
                {etapas.map((e) => (
                  <BarraSimple
                    key={e.clave}
                    nombre={e.etiqueta}
                    cifra={`${e.n} · ${mxn(e.monto)}`}
                    valor={e.n}
                    maximo={maxEtapa}
                    color={e.color}
                    hueco={e.hueco}
                    titulo={`${e.etiqueta}: ${e.n} comprobaciones · ${mxn(e.monto)}`}
                  />
                ))}
              </div>
            </>
          ) : (
            <VacioGrafica>Aún no hay comprobaciones capturadas.</VacioGrafica>
          )}
        </Panel>

        <Panel>
          <TituloPanel
            icono="i-jersey"
            sub="Monto pendiente de comprobar y días de la comprobación más antigua."
          >
            Concentración por comisionado
          </TituloPanel>
          {porComisionado.length ? (
            <div className="grid gap-3">
              {porComisionado.map((c) => (
                <BarraSimple
                  key={c.id}
                  nombre={c.nombre}
                  sub={c.rol}
                  cifra={`${mxn(c.monto)} · ${c.dias} días`}
                  valor={c.monto}
                  maximo={maxComisionado}
                  color={c.dias > DIAS_EN_DICTAMEN ? "var(--estado-rojo)" : "var(--dato)"}
                />
              ))}
            </div>
          ) : (
            <VacioGrafica>Ningún comisionado tiene comprobaciones pendientes.</VacioGrafica>
          )}
        </Panel>

        <Panel>
          <TituloPanel icono="i-hoop" sub="La marca vertical es el presupuesto asignado del rubro.">
            Comprobado contra asignado por rubro
          </TituloPanel>
          {rubros.length ? (
            <>
              <LeyendaGrafica
                items={[
                  { etiqueta: "Comprobado", color: "var(--dato)" },
                  { etiqueta: "Asignado", color: "var(--ink)", linea: true },
                ]}
              />
              <div className="grid gap-3">
                {rubros.map((r) => (
                  <BarraCarril
                    key={r.rubro}
                    nombre={r.rubro}
                    cifra={`${r.pct}% · ${mxn(r.comp)} de ${mxn(r.asig)}`}
                    comprobado={r.comp}
                    asignado={r.asig}
                    maximoAsignado={maxRubro}
                  />
                ))}
              </div>
            </>
          ) : (
            <VacioGrafica>Aún no hay presupuesto asignado por rubro.</VacioGrafica>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <TituloPanel icono="i-bench" sub="Comprobaciones pendientes de dictamen por antigüedad.">
            Antigüedad de pendientes
          </TituloPanel>
          <div className="grid gap-3 sm:grid-cols-3">
            <Indicador titulo="Menos de 3 días" valor={String(menos3.length)} />
            <Indicador titulo="Entre 3 y 7 días" valor={String(tres7.length)} />
            <Indicador titulo="Más de 7 días" valor={String(mas7.length)} />
          </div>
        </Panel>

        <Panel>
          <TituloPanel icono="i-bench" sub="Gastos aprobados sin comprobante fiscal.">
            Comprobación sin factura
          </TituloPanel>
          {sinFactura.monto > 0 ? (
            <div>
              <p className="cifra text-2xl font-black" style={{ color: "var(--dato)" }}>
                {mxn(sinFactura.monto)}
              </p>
              <p className="text-xs text-ink-2">{sinFactura.pct}% de lo comprobado y aprobado</p>
              <p className="text-[11px] text-ink-3">
                {mxn(sinFactura.enDictamen)} adicionales en dictamen
              </p>
              <ul className="mt-3 grid gap-2">
                {sinFacturaEventos.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex flex-wrap items-center gap-2 rounded-[12px] border border-hair bg-card px-3 py-2"
                  >
                    <span className="min-w-40 flex-1 text-sm font-semibold">{ev.nombre}</span>
                    <span className="cifra text-sm font-bold">{mxn(ev.monto)}</span>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                      style={{ background: "var(--dato)" }}
                    >
                      {ev.pct}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay gastos aprobados sin comprobante fiscal.
            </p>
          )}
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
        <TituloPanel
          icono="i-court"
          sub="Verde: todo dictaminado. Amarillo: comprobaciones pendientes. Rojo: gastos rechazados o presupuesto excedido."
        >
          Semáforo de auditoría por evento
        </TituloPanel>
        <Tabla
          cabeceras={["Evento", "Clave", "Asignado", "Comprobado", "Pend. de comprobar", "% comprobado", "Semáforo"]}
          vacio="Aún no hay eventos registrados."
        >
          {estado.eventos.map((ev) => {
            const asig = estado.presupuestos.filter((p) => p.eventoId === ev.id).reduce((s, p) => suma(s, p.monto), 0);
            const gastosEv = estado.gastos.filter((g) => g.eventoId === ev.id && !esBorrador(g));
            const comp = gastosEv.filter(cuentaComprobado).reduce((s, g) => suma(s, g.montoMXN), 0);
            const pend = gastosEv.filter(estaPendiente);
            const rojo = comp > asig || gastosEv.some((g) => g.estatus === "Rechazado");
            const tono = rojo ? "error" : pend.length ? "alerta" : "ok";
            const texto = rojo ? "Rojo" : pend.length ? "Amarillo" : "Verde";
            return (
              <tr key={ev.id}>
                <Celda>{ev.nombre}</Celda>
                <Celda>{ev.clave}</Celda>
                <Celda>{mxn(asig)}</Celda>
                <Celda>{mxn(comp)}</Celda>
                <Celda>{mxn(resta(asig, comp))}</Celda>
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
