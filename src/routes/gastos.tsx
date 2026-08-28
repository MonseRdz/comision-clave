import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, mxn, nuevoId, fechaCorta, esInmutable, hoyISO } from "@/lib/store";
import type { Archivo, Escala, Gasto, IaExtraccion } from "@/lib/types";
import { PAISES, rutaTexto } from "@/lib/paises";
import { buscarDuplicado, gastoRepetido, mensajeDuplicado } from "@/lib/duplicados";

import { ExtraccionIA } from "@/components/extraccion-ia";

import {
  Panel,
  TituloPanel,
  Boton,
  Campo,
  Entrada,
  AreaTexto,
  Selector,
  Aviso,
  Etiqueta,
  Tabla,
  Celda,
} from "@/components/glass";

export const Route = createFileRoute("/gastos")({
  head: () => ({
    meta: [
      { title: "Registro de gastos | Comprobación de Gastos" },
      {
        name: "description",
        content: "Carga de CFDI, evidencia nominal, gastos sin factura y moneda extranjera.",
      },
      { property: "og:title", content: "Registro de gastos | Comprobación de Gastos" },
      {
        property: "og:description",
        content: "Registra comprobaciones con archivos adjuntos y participantes autorizados.",
      },
    ],
  }),
  component: Gastos,
});

const tonoEstatus = (e: Gasto["estatus"]) =>
  e === "Aprobado" ? "ok" : e === "Rechazado" ? "error" : e === "Devuelto para corrección" ? "alerta" : "neutro";

function Gastos() {
  const { estado, setEstado, registrar, usuarioActual } = useStore();
  const [f, setF] = useState({
    eventoId: estado.eventos[0]?.id ?? "",
    rubro: estado.rubros[0] ?? "",
    proveedor: "",
    monto: "",
    moneda: "MXN" as Gasto["moneda"],
    tipoCambio: "1",
    sinCFDI: false,
    justificacion: "",
    origenPais: "MEX",
    origenCiudad: "",
    destinoPais: "MEX",
    destinoCiudad: "",
  });
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [participantes, setParticipantes] = useState<string[]>([]);
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [pases, setPases] = useState<Record<string, Archivo>>({});
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const [iaMeta, setIaMeta] = useState<IaExtraccion | null>(null);


  const [detalle, setDetalle] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<{ id: string; monto: string } | null>(null);

  const evento = estado.eventos.find((e) => e.id === f.eventoId);
  const esTransporte = f.rubro === "Transporte";
  const nominales = evento?.participantes ?? [];
  const faltanPases = esTransporte ? nominales.filter((p) => !pases[p.id]) : [];
  const monto = Number(f.monto) || 0;
  const tc = f.moneda === "MXN" ? 1 : Number(f.tipoCambio) || 0;
  const montoMXN = Math.round(monto * tc * 100) / 100;

  function leerArchivo(file: File): Promise<Archivo> {
    return new Promise<Archivo>((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({ nombre: file.name, tipo: file.type || "archivo", dataUrl: String(reader.result) });
      reader.onerror = () => resolve({ nombre: file.name, tipo: file.type || "archivo", dataUrl: "" });
      reader.readAsDataURL(file);
    });
  }

  async function cargarPase(participanteId: string, lista: FileList | null) {
    const file = lista?.[0];
    if (!file) return;
    const leido = await leerArchivo(file);
    const otros = [
      ...archivos,
      ...Object.entries(pases)
        .filter(([k]) => k !== participanteId)
        .map(([, a]) => a),
    ];
    const dup = await buscarDuplicado([leido], estado.gastos);
    const dupLocal = await buscarDuplicado([leido, ...otros], []);
    if (dup || dupLocal) {
      setError(mensajeDuplicado(leido.nombre, dup?.coincidencia ?? null));
      return;
    }
    setError("");
    setPases((prev) => ({ ...prev, [participanteId]: { ...leido, participanteId } }));
  }

  async function cargarArchivos(lista: FileList | null) {
    if (!lista) return;
    const leidos = await Promise.all(
      Array.from(lista).map(
        (file) =>
          new Promise<Archivo>((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({ nombre: file.name, tipo: file.type || "archivo", dataUrl: String(reader.result) });
            reader.onerror = () => resolve({ nombre: file.name, tipo: file.type || "archivo", dataUrl: "" });
            reader.readAsDataURL(file);
          }),
      ),
    );
    const aceptados: Archivo[] = [];
    for (const a of leidos) {
      const dup = await buscarDuplicado([a], estado.gastos);
      const dupLocal = await buscarDuplicado([a, ...archivos, ...aceptados], []);
      if (dup || dupLocal) {
        setError(mensajeDuplicado(a.nombre, dup?.coincidencia ?? null));
        continue;
      }
      aceptados.push(a);
    }
    if (aceptados.length) setArchivos((prev) => [...prev, ...aceptados]);
  }

  async function registrarGasto(ev: React.FormEvent) {
    ev.preventDefault();
    setAviso("");
    if (!f.proveedor.trim()) return setError("Captura el proveedor o concepto del gasto.");
    if (monto <= 0) return setError("El monto debe ser mayor a cero.");
    if (f.moneda !== "MXN" && tc <= 0) return setError("Captura el tipo de cambio manual.");
    if (participantes.length === 0) return setError("Selecciona al menos un participante autorizado.");
    if (f.sinCFDI) {
      if (montoMXN > estado.topeSinComprobante)
        return setError(
          `Un gasto sin CFDI no puede exceder el tope de ${mxn(estado.topeSinComprobante)}.`,
        );
      if (!f.justificacion.trim()) return setError("La justificación es obligatoria en gastos sin CFDI.");
    } else if (archivos.length === 0) {
      return setError("Adjunta la factura (XML/PDF) o marca el gasto como Sin CFDI.");
    }

    const avisosPendientes: string[] = [];
    if (esTransporte) {
      if (!f.origenPais || !f.origenCiudad.trim() || !f.destinoPais || !f.destinoCiudad.trim())
        avisosPendientes.push("faltan datos completos de Origen y Destino");
      if (faltanPases.length)
        avisosPendientes.push(
          `faltan pases de abordar de: ${faltanPases.map((p) => p.nombre).join(", ")}`,
        );
    }

    const adjuntos: Archivo[] = esTransporte
      ? [...archivos, ...nominales.map((p) => pases[p.id]).filter((a): a is Archivo => Boolean(a))]
      : archivos;

    const dupDoc = await buscarDuplicado(adjuntos, estado.gastos);
    if (dupDoc) return setError(mensajeDuplicado(dupDoc.archivo, dupDoc.coincidencia));


    const g: Gasto = {
      id: nuevoId("g"),
      eventoId: f.eventoId,
      rubro: f.rubro,
      proveedor: f.proveedor.trim(),
      monto,
      moneda: f.moneda,
      tipoCambio: tc,
      montoMXN,
      sinCFDI: f.sinCFDI,
      justificacion: f.justificacion.trim(),
      origenPais: esTransporte ? f.origenPais : "",
      origenCiudad: esTransporte ? f.origenCiudad.trim() : "",
      destinoPais: esTransporte ? f.destinoPais : "",
      destinoCiudad: esTransporte ? f.destinoCiudad.trim() : "",
      escalas: esTransporte
        ? escalas
            .filter((x) => x.pais)
            .map((x) => ({ pais: x.pais, ciudad: x.ciudad.trim() }))
        : [],
      participantesIds: participantes,
      archivos: adjuntos,
      estatus: "Registrado",
      observaciones: "",
      comisionadoId: usuarioActual.id,
      creadoEn: hoyISO(),
    };
    const repetido = gastoRepetido(estado.gastos, g);
    if (repetido)
      return setError(
        `Candado antiduplicados: ya existe un gasto de "${repetido.proveedor}" en el mismo evento y rubro por ${mxn(repetido.montoMXN)} (${repetido.estatus}). No se puede registrar dos veces el mismo comprobante.`,
      );
    if (iaMeta)

      g.iaExtraccion = {
        ...iaMeta,
        confirmado: {
          ...iaMeta.confirmado,
          proveedor: g.proveedor,
          monto: String(g.monto),
          moneda: g.moneda,
          rubro: g.rubro,
        },
      };
    setEstado((e) => ({ ...e, gastos: [g, ...e.gastos] }));

    registrar(
      "Registro de gasto",
      `${g.proveedor} por ${mxn(g.montoMXN)} (${g.rubro}) ${g.sinCFDI ? "sin CFDI" : "con CFDI"}.`,
    );
    setError("");
    setAviso(
      avisosPendientes.length
        ? `Gasto de ${g.proveedor} registrado por ${mxn(g.montoMXN)}, con evidencia incompleta: ${avisosPendientes.join("; ")}. El Revisor lo verá marcado.`
        : `Gasto de ${g.proveedor} registrado por ${mxn(g.montoMXN)}.`,
    );
    setF({
      ...f,
      proveedor: "",
      monto: "",
      justificacion: "",
      sinCFDI: false,
      moneda: "MXN",
      tipoCambio: "1",
      origenCiudad: "",
      destinoCiudad: "",
    });
    setEscalas([]);
    setParticipantes([]);
    setArchivos([]);
    setPases({});
    setIaMeta(null);
  }


  function guardarEdicion(g: Gasto) {
    if (esInmutable(g)) {
      setError(
        `El gasto de "${g.proveedor}" ya fue dictaminado (${g.estatus}) y es inmutable: no puede editarse.`,
      );
      setEdicion(null);
      return;
    }
    const nuevo = Number(edicion?.monto);
    if (!Number.isFinite(nuevo) || nuevo <= 0) return setError("El monto debe ser mayor a cero.");
    setEstado((e) => ({
      ...e,
      gastos: e.gastos.map((x) =>
        x.id === g.id
          ? { ...x, monto: nuevo, montoMXN: Math.round(nuevo * x.tipoCambio * 100) / 100 }
          : x,
      ),
    }));
    registrar("Edición de gasto", `Monto de ${g.proveedor} actualizado a ${nuevo} ${g.moneda}.`);
    setError("");
    setAviso(`Monto de "${g.proveedor}" actualizado.`);
    setEdicion(null);
  }

  const mios =
    usuarioActual.rol === "Contralor"
      ? estado.gastos
      : estado.gastos.filter((g) => g.comisionadoId === usuarioActual.id);

  return (
    <div className="grid gap-4 pt-4">
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {aviso ? <Aviso>{aviso}</Aviso> : null}

      <ExtraccionIA
        onConfirmar={({ campos, archivo, meta }) => {
          setF((prev) => ({
            ...prev,
            proveedor: campos.proveedor || prev.proveedor,
            monto: campos.monto || prev.monto,
            moneda: (["MXN", "USD", "EUR"].includes(campos.moneda)
              ? campos.moneda
              : prev.moneda) as Gasto["moneda"],
            tipoCambio: campos.moneda === "MXN" ? "1" : prev.tipoCambio,
            rubro: campos.rubro || prev.rubro,
          }));
          setArchivos((a) => (a.some((x) => x.nombre === archivo.nombre) ? a : [...a, archivo]));
          setIaMeta(meta);
          setError("");
        }}
      />


      <Panel>
        <TituloPanel sub="Factura CFDI, evidencia nominal, gastos sin comprobante y moneda extranjera.">
          Registrar comprobación
        </TituloPanel>
        <form onSubmit={registrarGasto} className="grid gap-3 md:grid-cols-3">
          <Campo etiqueta="Evento" id="g-ev">
            <Selector
              id="g-ev"
              value={f.eventoId}
              onChange={(e) => {
                setF({ ...f, eventoId: e.target.value });
                setParticipantes([]);
                setPases({});
              }}
            >
              {estado.eventos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </Selector>
          </Campo>
          <Campo etiqueta="Rubro" id="g-rubro">
            <Selector id="g-rubro" value={f.rubro} onChange={(e) => setF({ ...f, rubro: e.target.value })}>
              {estado.rubros.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Selector>
          </Campo>
          <Campo etiqueta="Proveedor o concepto" id="g-prov">
            <Entrada id="g-prov" value={f.proveedor} onChange={(e) => setF({ ...f, proveedor: e.target.value })} />
          </Campo>
          <Campo etiqueta="Monto" id="g-monto">
            <Entrada
              id="g-monto"
              type="number"
              min={0}
              step="0.01"
              value={f.monto}
              onChange={(e) => setF({ ...f, monto: e.target.value })}
            />
          </Campo>
          <Campo etiqueta="Moneda" id="g-moneda">
            <Selector
              id="g-moneda"
              value={f.moneda}
              onChange={(e) =>
                setF({
                  ...f,
                  moneda: e.target.value as Gasto["moneda"],
                  tipoCambio: e.target.value === "MXN" ? "1" : f.tipoCambio,
                })
              }
            >
              <option value="MXN">MXN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </Selector>
          </Campo>
          <Campo
            etiqueta="Tipo de cambio (captura manual)"
            id="g-tc"
            ayuda="La app no consulta Banxico: el tipo de cambio se captura manualmente."
          >
            <Entrada
              id="g-tc"
              type="number"
              min={0}
              step="0.0001"
              disabled={f.moneda === "MXN"}
              value={f.tipoCambio}
              onChange={(e) => setF({ ...f, tipoCambio: e.target.value })}
            />
          </Campo>

          <div className="md:col-span-3">
            <Aviso>Equivalente en pesos: <strong>{mxn(montoMXN)}</strong></Aviso>
          </div>

          {esTransporte ? (
            <fieldset className="md:col-span-3 rounded-lg border-2 border-border-strong p-3">
              <legend className="px-1 text-sm font-semibold">Traslado (rubro Transporte)</legend>
              <div className="grid gap-3 md:grid-cols-2">
                <Campo etiqueta="País de origen" id="g-op">
                  <Selector id="g-op" value={f.origenPais} onChange={(e) => setF({ ...f, origenPais: e.target.value })}>
                    {PAISES.map((p) => (
                      <option key={p.clave} value={p.clave}>
                        {p.clave} — {p.nombre}
                      </option>
                    ))}
                  </Selector>
                </Campo>
                <Campo etiqueta="Ciudad de origen" id="g-oc">
                  <Entrada
                    id="g-oc"
                    value={f.origenCiudad}
                    onChange={(e) => setF({ ...f, origenCiudad: e.target.value })}
                    placeholder="Ej. Ciudad de México"
                  />
                </Campo>
                <Campo etiqueta="País de destino" id="g-dp">
                  <Selector id="g-dp" value={f.destinoPais} onChange={(e) => setF({ ...f, destinoPais: e.target.value })}>
                    {PAISES.map((p) => (
                      <option key={p.clave} value={p.clave}>
                        {p.clave} — {p.nombre}
                      </option>
                    ))}
                  </Selector>
                </Campo>
                <Campo etiqueta="Ciudad de destino" id="g-dc">
                  <Entrada
                    id="g-dc"
                    value={f.destinoCiudad}
                    onChange={(e) => setF({ ...f, destinoCiudad: e.target.value })}
                    placeholder="Ej. Hermosillo"
                  />
                </Campo>
              </div>

              <div className="mt-4">
                <p className="text-sm font-semibold">Escalas o paradas intermedias</p>
                <p className="text-sm text-muted-foreground">
                  Agrega las escalas del traslado entre el origen y el destino, en el orden del recorrido.
                </p>
                <ul className="mt-2 grid gap-3">
                  {escalas.map((es, i) => (
                    <li
                      key={i}
                      className="grid gap-3 rounded-md border-2 border-border-strong p-3 md:grid-cols-[1fr_1fr_auto] md:items-end"
                    >
                      <Campo etiqueta={`País de la escala ${i + 1}`} id={`g-ep-${i}`}>
                        <Selector
                          id={`g-ep-${i}`}
                          value={es.pais}
                          onChange={(e) =>
                            setEscalas((prev) =>
                              prev.map((x, j) => (j === i ? { ...x, pais: e.target.value } : x)),
                            )
                          }
                        >
                          {PAISES.map((p) => (
                            <option key={p.clave} value={p.clave}>
                              {p.clave} — {p.nombre}
                            </option>
                          ))}
                        </Selector>
                      </Campo>
                      <Campo etiqueta={`Ciudad de la escala ${i + 1}`} id={`g-ec-${i}`}>
                        <Entrada
                          id={`g-ec-${i}`}
                          value={es.ciudad}
                          onChange={(e) =>
                            setEscalas((prev) =>
                              prev.map((x, j) => (j === i ? { ...x, ciudad: e.target.value } : x)),
                            )
                          }
                          placeholder="Ej. Guadalajara"
                        />
                      </Campo>
                      <Boton
                        type="button"
                        variante="neutro"
                        onClick={() => setEscalas((prev) => prev.filter((_, j) => j !== i))}
                      >
                        Quitar escala {i + 1}
                      </Boton>
                    </li>
                  ))}
                </ul>
                <div className="mt-3">
                  <Boton
                    type="button"
                    variante="neutro"
                    onClick={() => setEscalas((prev) => [...prev, { pais: "MEX", ciudad: "" }])}
                  >
                    {escalas.length === 0 ? "Agregar escala" : "Agregar otra escala"}
                  </Boton>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ruta capturada:{" "}
                  <strong>
                    {rutaTexto(
                      { pais: f.origenPais, ciudad: f.origenCiudad },
                      escalas,
                      { pais: f.destinoPais, ciudad: f.destinoCiudad },
                    )}
                  </strong>
                </p>
              </div>

              <div className="mt-4">
                <p className="text-sm font-semibold">Pases de abordar por participante del evento</p>
                <p className="text-sm text-muted-foreground">
                  Carga el pase de abordar de cada participante de la lista nominal. Si falta alguno, el gasto se
                  registra marcado como evidencia incompleta.
                </p>
                <ul className="mt-2 grid gap-2">
                  {nominales.length ? (
                    nominales.map((p) => (
                      <li
                        key={p.id}
                        className="grid gap-2 rounded-md border-2 border-border-strong bg-glass-strong p-2 md:grid-cols-[1fr_auto] md:items-center"
                      >
                        <Campo etiqueta={`Pase de abordar de ${p.nombre}`} id={`pase-${p.id}`}>
                          <input
                            id={`pase-${p.id}`}
                            type="file"
                            onChange={(e) => cargarPase(p.id, e.target.files)}
                            className="w-full rounded-md border-2 border-border-strong bg-input px-3 py-2 text-sm"
                          />
                        </Campo>
                        <Etiqueta tono={pases[p.id] ? "ok" : "alerta"}>
                          {pases[p.id]?.nombre ?? "Pendiente"}
                        </Etiqueta>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">El evento no tiene lista nominal cargada.</li>
                  )}
                </ul>
              </div>
            </fieldset>
          ) : null}

          <fieldset className="md:col-span-3 rounded-lg border-2 border-border-strong p-3">
            <legend className="px-1 text-sm font-semibold">Comprobante fiscal</legend>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-2 border-border-strong"
                checked={f.sinCFDI}
                onChange={(e) => setF({ ...f, sinCFDI: e.target.checked })}
              />
              Gasto Sin CFDI (tope {mxn(estado.topeSinComprobante)}, requiere justificación)
            </label>
            {f.sinCFDI ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Campo etiqueta="Justificación del catálogo" id="g-just">
                  <Selector
                    id="g-just"
                    value={estado.justificacionesSinCFDI.includes(f.justificacion) ? f.justificacion : ""}
                    onChange={(e) => setF({ ...f, justificacion: e.target.value })}
                  >
                    <option value="">Selecciona una justificación…</option>
                    {estado.justificacionesSinCFDI.map((j) => (
                      <option key={j}>{j}</option>
                    ))}
                  </Selector>
                </Campo>
                <Campo etiqueta="Justificación (obligatoria)" id="g-just2">
                  <AreaTexto
                    id="g-just2"
                    value={f.justificacion}
                    onChange={(e) => setF({ ...f, justificacion: e.target.value })}
                    placeholder="Ej. Transporte local"
                  />
                </Campo>
              </div>
            ) : (
              <div className="mt-3">
                <Campo
                  etiqueta="Archivos (factura XML/PDF y evidencia)"
                  id="g-files"
                  ayuda="Puedes adjuntar varios archivos: XML, PDF, pases de abordar, fotos."
                >
                  <input
                    id="g-files"
                    type="file"
                    multiple
                    onChange={(e) => cargarArchivos(e.target.files)}
                    className="w-full rounded-md border-2 border-border-strong bg-input px-3 py-2 text-sm"
                  />
                </Campo>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {archivos.map((a) => (
                    <li key={a.nombre}>
                      <Etiqueta tono="marca">{a.nombre}</Etiqueta>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </fieldset>

          <fieldset className="md:col-span-3 rounded-lg border-2 border-border-strong p-3">
            <legend className="px-1 text-sm font-semibold">Participantes autorizados que usaron el servicio</legend>
            <div className="flex flex-wrap gap-3">
              {evento?.participantes.length ? (
                evento.participantes.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 rounded-md border-2 border-border-strong bg-glass-strong px-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={participantes.includes(p.id)}
                      onChange={(e) =>
                        setParticipantes((prev) =>
                          e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id),
                        )
                      }
                    />
                    {p.nombre} <span className="text-muted-foreground">({p.tipo})</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">El evento no tiene lista nominal cargada.</p>
              )}
            </div>
          </fieldset>

          <div className="md:col-span-3">
            <Boton type="submit">Registrar gasto</Boton>
          </div>
        </form>
      </Panel>

      <Panel>
        <TituloPanel sub="Comprobaciones registradas y su estatus de dictamen.">Mis gastos</TituloPanel>
        <Tabla cabeceras={["Fecha", "Proveedor", "Rubro", "Monto", "MXN", "CFDI", "Estatus", "Acciones"]}>
          {mios.map((g) => (
            <tr key={g.id}>
              <Celda>{fechaCorta(g.creadoEn)}</Celda>
              <Celda>{g.proveedor}</Celda>
              <Celda>{g.rubro}</Celda>
              <Celda>
                {g.monto.toLocaleString("es-MX")} {g.moneda}
                {g.moneda !== "MXN" ? ` × ${g.tipoCambio}` : ""}
              </Celda>
              <Celda>{mxn(g.montoMXN)}</Celda>
              <Celda>{g.sinCFDI ? `Sin CFDI — ${g.justificacion}` : "Con CFDI"}</Celda>
              <Celda>
                <Etiqueta tono={tonoEstatus(g.estatus)}>{g.estatus}</Etiqueta>
                {g.observaciones ? (
                  <p className="mt-1 text-xs">Observación: {g.observaciones}</p>
                ) : null}
              </Celda>
              <Celda>
                <div className="flex flex-wrap gap-2">
                  <Boton variante="neutro" onClick={() => setDetalle(detalle === g.id ? null : g.id)}>
                    {detalle === g.id ? "Ocultar" : "Ver adjuntos"}
                  </Boton>
                  {edicion?.id === g.id ? (
                    <span className="flex items-center gap-2">
                      <label className="sr-only" htmlFor={`ed-${g.id}`}>
                        Nuevo monto
                      </label>
                      <Entrada
                        id={`ed-${g.id}`}
                        className="w-28"
                        type="number"
                        value={edicion.monto}
                        onChange={(e) => setEdicion({ id: g.id, monto: e.target.value })}
                      />
                      <Boton onClick={() => guardarEdicion(g)}>Guardar</Boton>
                    </span>
                  ) : (
                    <Boton
                      variante="neutro"
                      onClick={() => {
                        if (esInmutable(g)) {
                          setAviso("");
                          setError(
                            `El gasto de "${g.proveedor}" ya fue dictaminado (${g.estatus}) y es inmutable: no puede editarse.`,
                          );
                          return;
                        }
                        setError("");
                        setEdicion({ id: g.id, monto: String(g.monto) });
                      }}
                    >
                      Editar monto
                    </Boton>
                  )}
                </div>
                {detalle === g.id ? (
                  <ul className="mt-2 space-y-1 text-sm">
                    {g.archivos.length ? (
                      g.archivos.map((a) => (
                        <li key={a.nombre}>
                          {a.dataUrl ? (
                            <a
                              className="font-semibold underline"
                              href={a.dataUrl}
                              target="_blank"
                              rel="noreferrer"
                              download={a.nombre}
                            >
                              {a.nombre}
                            </a>
                          ) : (
                            <span>{a.nombre} (documento de ejemplo)</span>
                          )}
                        </li>
                      ))
                    ) : (
                      <li className="text-muted-foreground">Sin archivos adjuntos.</li>
                    )}
                    {g.origenPais || g.destinoPais ? (
                      <li className="text-muted-foreground">
                        Traslado:{" "}
                        {rutaTexto(
                          { pais: g.origenPais, ciudad: g.origenCiudad },
                          g.escalas ?? [],
                          { pais: g.destinoPais, ciudad: g.destinoCiudad },
                        )}
                      </li>
                    ) : null}
                    <li className="text-muted-foreground">
                      Participantes:{" "}
                      {g.participantesIds
                        .map(
                          (id) =>
                            estado.eventos
                              .find((e) => e.id === g.eventoId)
                              ?.participantes.find((p) => p.id === id)?.nombre ?? id,
                        )
                        .join(", ")}
                    </li>
                  </ul>
                ) : null}
              </Celda>
            </tr>
          ))}
        </Tabla>
      </Panel>
    </div>
  );
}
