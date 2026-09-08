import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { actualizarGasto, insertarAceptacion, subirArchivo } from "@/lib/db";
import { ArchivoEnlace } from "./archivo-enlace";
import { Boton, Campo, Entrada, Selector, Aviso, Etiqueta } from "./glass";
import { mxn, useStore, hoyISO, nuevoId } from "@/lib/store";
import { abonosSinREP, baseConciliacion, diferenciaPago, sumaAbonos } from "@/lib/pago";
import { extraerPago } from "@/lib/pago-extraccion.functions";
import { SERVICIO_IA } from "@/lib/extraccion.functions";
import { VERSION_CONSENTIMIENTO } from "./extraccion-ia";
import {
  FORMAS_PAGO,
  TIPOS_DESEMBOLSO,
  type AbonoPago,
  type Archivo,
  type ComprobantePago,
  type FormaPago,
  type Gasto,
  type TipoDesembolso,
} from "@/lib/types";


function leerArchivo(file: File): Promise<Archivo> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({ nombre: file.name, tipo: file.type, dataUrl: String(reader.result) });
    reader.onerror = () => reject(new Error(`No se pudo leer "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

type Borrador = Omit<ComprobantePago, "abonos">;

/**
 * Sección de evidencia bancaria del desembolso. La captura quien dictamina
 * (Contralor o Director con delegación vigente); no aparece en la captura del
 * gasto ni para el Comisionado.
 */
export function ComprobantePagoGasto({
  gasto,
  nombreComisionado,
  onGuardado,
  registrar,
}: {
  gasto: Gasto;
  nombreComisionado: string;
  onGuardado: (g: Gasto) => void;
  registrar: (accion: string, detalle: string) => Promise<void>;
}) {
  const previo = gasto.pago;
  const [d, setD] = useState<Borrador>({
    tipoDesembolso: previo?.tipoDesembolso ?? "Pago directo al proveedor",
    formaPago: previo?.formaPago ?? "Transferencia",
    fecha: previo?.fecha ?? "",
    referencia: previo?.referencia ?? "",
    cuentaOrdenante: previo?.cuentaOrdenante ?? "",
    beneficiario: previo?.beneficiario ?? "",
    esPPD: previo?.esPPD ?? false,
  });
  const [abonos, setAbonos] = useState<AbonoPago[]>(previo?.abonos ?? []);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [avisoIA, setAvisoIA] = useState("");
  /** Campos capturados a mano: la lectura por IA nunca los pisa. */
  const [tocado, setTocado] = useState<Record<string, boolean>>({});
  /** Campos que provienen de la lectura por IA, para marcarlos visualmente. */
  const [deIA, setDeIA] = useState<Record<string, boolean>>({});

  const { estado, setEstado, usuarioActual } = useStore();
  const extraer = useServerFn(extraerPago);
  const aceptoIA = estado.aceptaciones.some(
    (a) => a.usuarioId === usuarioActual.id && a.version === VERSION_CONSENTIMIENTO,
  );

  /** Marca el campo como capturado a mano y lo actualiza. */
  const capturar = (campo: keyof Borrador, valor: string) => {
    setTocado((t) => ({ ...t, [campo]: true }));
    setDeIA((m) => ({ ...m, [campo]: false }));
    setD((prev) => ({ ...prev, [campo]: valor }));
  };

  const beneficiarioSugerido =
    d.tipoDesembolso === "Reembolso al comisionado" ? nombreComisionado : gasto.proveedor;
  const esProveedor = d.tipoDesembolso === "Pago directo al proveedor";
  const propuesta: ComprobantePago = { ...d, esPPD: esProveedor && d.esPPD, abonos };
  const total = sumaAbonos(propuesta);
  const base = baseConciliacion(gasto);
  const dif = Number((total - base).toFixed(2));
  const faltanREP = abonosSinREP(propuesta);

  async function aceptarConsentimientoIA() {
    try {
      const guardado = await insertarAceptacion({
        id: nuevoId("ia"),
        usuarioId: usuarioActual.id,
        fecha: hoyISO(),
        version: VERSION_CONSENTIMIENTO,
      });
      setEstado((e) => ({ ...e, aceptaciones: [...e.aceptaciones, guardado] }));
      await registrar(
        "Consentimiento LFPDPPP (IA)",
        `Aceptó el procesamiento de comprobantes por ${SERVICIO_IA} (${VERSION_CONSENTIMIENTO}).`,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  /** Pre-llena con la lectura del comprobante bancario, sin pisar lo capturado a mano. */
  async function prellenar(archivo: Archivo, indice: number) {
    if (!aceptoIA) return;
    setLeyendo(true);
    setAvisoIA("");
    try {
      const r = await extraer({
        data: {
          nombre: archivo.nombre,
          tipo: archivo.tipo,
          dataUrl: archivo.dataUrl ?? "",
          beneficiarioEsperado: beneficiarioSugerido,
        },
      });
      if (!r.ok) {
        setAvisoIA(r.mensaje);
        return;
      }
      const marcados: string[] = [];
      setD((prev) => {
        const sig = { ...prev };
        (["referencia", "cuentaOrdenante", "beneficiario", "fecha"] as const).forEach((k) => {
          const propuesto = r.campos[k];
          if (propuesto && !tocado[k] && !prev[k]) {
            sig[k] = propuesto;
            marcados.push(k);
          }
        });
        return sig;
      });
      if (marcados.length) setDeIA((m) => ({ ...m, ...Object.fromEntries(marcados.map((k) => [k, true])) }));
      const monto = Number(r.campos.monto);
      if (monto > 0)
        setAbonos((prev) => prev.map((a, j) => (j === indice && !(a.monto > 0) ? { ...a, monto } : a)));
      setAvisoIA(
        marcados.length || monto > 0
          ? "Lectura del comprobante: los datos marcados los propuso la IA. Revísalos y corrígelos si hace falta."
          : "No se pudieron leer datos del comprobante. Captúralos manualmente.",
      );
    } catch {
      setAvisoIA("No se pudo leer el comprobante de pago. Captura los datos manualmente.");
    } finally {
      setLeyendo(false);
    }
  }

  async function agregarAbono(lista: FileList | null) {
    if (!lista?.length) return;
    try {
      const nuevos = await Promise.all(Array.from(lista).map(leerArchivo));
      const inicio = abonos.length;
      setAbonos([...abonos, ...nuevos.map((archivo) => ({ archivo, monto: 0 }))]);
      setError("");
      const primero = nuevos[0];
      if (primero) await prellenar(primero, inicio);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }


  async function adjuntarREP(i: number, file: File | undefined) {
    if (!file) return;
    try {
      const rep = await leerArchivo(file);
      setAbonos(abonos.map((a, j) => (j === i ? { ...a, rep } : a)));
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function guardar() {
    const beneficiario = (d.beneficiario || beneficiarioSugerido).trim();
    if (!d.fecha) return setError("Captura la fecha del desembolso.");
    if (!abonos.length) return setError("Adjunta al menos un comprobante del desembolso.");
    if (abonos.some((a) => !(Number(a.monto) > 0)))
      return setError("Captura el monto de cada comprobante adjunto.");
    if (!d.referencia.trim()) return setError("Captura la referencia o clave de rastreo.");
    if (!d.cuentaOrdenante.trim()) return setError("Captura la cuenta ordenante de ADEMEBA.");
    if (!beneficiario) return setError("Captura el beneficiario del desembolso.");
    setGuardando(true);
    try {
      const subidos: AbonoPago[] = [];
      for (const a of abonos) {
        const archivo = await subirArchivo(gasto.id, a.archivo);
        const rep = a.rep ? await subirArchivo(gasto.id, a.rep) : undefined;
        subidos.push(rep ? { archivo, monto: Number(a.monto), rep } : { archivo, monto: Number(a.monto) });
      }
      const pago: ComprobantePago = {
        ...d,
        esPPD: esProveedor && d.esPPD,
        beneficiario,
        referencia: d.referencia.trim(),
        cuentaOrdenante: d.cuentaOrdenante.trim(),
        abonos: subidos,
      };
      const eraPendiente = gasto.pagoPendiente;
      const guardado = await actualizarGasto(gasto.id, { pago, pago_pendiente: false });
      setAbonos(subidos);
      onGuardado(guardado);
      await registrar(
        eraPendiente ? "Pago pendiente comprobado" : "Comprobante de pago",
        `Gasto ${gasto.id} (${gasto.proveedor}): ${pago.tipoDesembolso.toLowerCase()} a ${pago.beneficiario} por ${mxn(
          sumaAbonos(pago),
        )} · ${pago.formaPago} · ${pago.fecha} · referencia ${pago.referencia} · cuenta ordenante ${
          pago.cuentaOrdenante
        } · ${pago.abonos.length} documento(s)${eraPendiente ? " · se retira la marca de pago pendiente" : ""}.`,
      );
      setError("");
      setOk("Comprobante de pago guardado.");
    } catch (e: unknown) {
      setOk("");
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mt-3 grid gap-3 rounded-[12px] border border-hair bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-sm">Comprobante de pago del gasto</strong>
        {gasto.pagoPendiente ? (
          <Etiqueta tono="alerta">Comprobante de pago pendiente · trazabilidad incompleta</Etiqueta>
        ) : null}
      </div>
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {ok ? <Aviso>{ok}</Aviso> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <Campo etiqueta="Tipo de desembolso" id={`td-${gasto.id}`}>
          <Selector
            id={`td-${gasto.id}`}
            value={d.tipoDesembolso}
            onChange={(e) => setD({ ...d, tipoDesembolso: e.target.value as TipoDesembolso })}
          >
            {TIPOS_DESEMBOLSO.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Selector>
        </Campo>
        <Campo etiqueta="Forma de pago" id={`fp-${gasto.id}`}>
          <Selector
            id={`fp-${gasto.id}`}
            value={d.formaPago}
            onChange={(e) => setD({ ...d, formaPago: e.target.value as FormaPago })}
          >
            {FORMAS_PAGO.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Selector>
        </Campo>
        <Campo etiqueta="Fecha del desembolso" id={`fd-${gasto.id}`}>
          <Entrada
            id={`fd-${gasto.id}`}
            type="date"
            value={d.fecha}
            onChange={(e) => setD({ ...d, fecha: e.target.value })}
          />
        </Campo>
        <Campo etiqueta="Referencia o clave de rastreo" id={`rf-${gasto.id}`}>
          <Entrada
            id={`rf-${gasto.id}`}
            value={d.referencia}
            onChange={(e) => setD({ ...d, referencia: e.target.value })}
          />
        </Campo>
        <Campo etiqueta="Cuenta ordenante (ADEMEBA)" id={`co-${gasto.id}`}>
          <Entrada
            id={`co-${gasto.id}`}
            value={d.cuentaOrdenante}
            onChange={(e) => setD({ ...d, cuentaOrdenante: e.target.value })}
          />
        </Campo>
        <Campo
          etiqueta={esProveedor ? "Beneficiario (proveedor)" : "Beneficiario (comisionado)"}
          id={`be-${gasto.id}`}
        >
          <Entrada
            id={`be-${gasto.id}`}
            value={d.beneficiario || beneficiarioSugerido}
            onChange={(e) => setD({ ...d, beneficiario: e.target.value })}
          />
        </Campo>
      </div>

      {esProveedor ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={d.esPPD}
            onChange={(e) => setD({ ...d, esPPD: e.target.checked })}
          />
          La factura es PPD (requiere CFDI con complemento de pago por cada abono)
        </label>
      ) : null}

      <div className="grid gap-2">
        <Campo etiqueta="Comprobantes del desembolso (CEP, estado de cuenta, transferencia o cheque)" id={`ar-${gasto.id}`}>
          <input
            id={`ar-${gasto.id}`}
            type="file"
            multiple
            accept=".pdf,.xml,image/*"
            onChange={(e) => {
              void agregarAbono(e.target.files);
              e.target.value = "";
            }}
            className="text-sm"
          />
        </Campo>
        {abonos.map((a, i) => (
          <div key={`${a.archivo.nombre}-${i}`} className="grid gap-2 rounded-[10px] border border-hair p-2 md:grid-cols-3 md:items-end">
            <div className="text-sm">
              <ArchivoEnlace archivo={a.archivo} />
            </div>
            <Campo etiqueta="Monto del abono" id={`mo-${gasto.id}-${i}`}>
              <Entrada
                id={`mo-${gasto.id}-${i}`}
                type="number"
                step="0.01"
                value={a.monto || ""}
                onChange={(e) =>
                  setAbonos(abonos.map((x, j) => (j === i ? { ...x, monto: Number(e.target.value) } : x)))
                }
              />
            </Campo>
            <div className="flex flex-wrap items-center gap-2">
              {propuesta.esPPD ? (
                a.rep ? (
                  <span className="text-xs">
                    REP: <ArchivoEnlace archivo={a.rep} />
                  </span>
                ) : (
                  <Campo etiqueta="CFDI con complemento de pago (REP)" id={`rep-${gasto.id}-${i}`}>
                    <input
                      id={`rep-${gasto.id}-${i}`}
                      type="file"
                      accept=".pdf,.xml"
                      onChange={(e) => {
                        void adjuntarREP(i, e.target.files?.[0]);
                        e.target.value = "";
                      }}
                      className="text-sm"
                    />
                  </Campo>
                )
              ) : null}
              <Boton variante="neutro" onClick={() => setAbonos(abonos.filter((_, j) => j !== i))}>
                Quitar
              </Boton>
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm">
        Desembolsado <strong className="cifra">{mxn(total)}</strong> · conciliar contra{" "}
        <strong className="cifra">{mxn(base)}</strong>
      </p>
      {abonos.length && Math.abs(dif) > 0.01 ? (
        <Aviso tono="alerta">
          El desembolso no cuadra con el monto a conciliar: diferencia de {mxn(Math.abs(dif))} (
          {dif > 0 ? "de más" : "de menos"}). Es solo un aviso, no bloquea el dictamen.
        </Aviso>
      ) : null}
      {faltanREP ? (
        <Aviso tono="alerta">
          Falta el CFDI con complemento de pago (REP) de {faltanREP} abono(s) de esta factura PPD.
        </Aviso>
      ) : null}

      <div>
        <Boton onClick={() => void guardar()} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar comprobante de pago"}
        </Boton>
      </div>
    </div>
  );
}

/** Resumen textual del desembolso para expediente y consultas. */
export function ResumenPago({ gasto }: { gasto: Gasto }) {
  const p = gasto.pago;
  if (!p) return <span className="text-sm text-muted-foreground">Sin comprobante de pago</span>;
  return (
    <span className="text-xs text-muted-foreground">
      {p.tipoDesembolso} · {p.beneficiario} · {p.formaPago} · {p.fecha} · ref. {p.referencia} ·{" "}
      {mxn(sumaAbonos(p))}
      {Math.abs(diferenciaPago(gasto)) > 0.01 ? " · no concilia" : ""}
    </span>
  );
}
