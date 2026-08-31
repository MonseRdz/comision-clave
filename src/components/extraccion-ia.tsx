import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useStore, hoyISO, nuevoId } from "@/lib/store";
import { leerCFDI, FISCAL_VACIO, type Propuesta, type DatosFiscales } from "@/lib/cfdi";
import { extraerComprobante, SERVICIO_IA } from "@/lib/extraccion.functions";
import type { Archivo, IaExtraccion } from "@/lib/types";
import { buscarDuplicado, huellaArchivo, mensajeDuplicado } from "@/lib/duplicados";
import { Panel, TituloPanel, Boton, Campo, Entrada, Selector, Aviso, Etiqueta } from "./glass";

export const VERSION_CONSENTIMIENTO = "IA-LFPDPPP v1.0";
const MAX_MB = 10;
const FORMATOS = ".xml,.pdf,.jpg,.jpeg,.png,.heic";

export type ResultadoConfirmado = {
  campos: { proveedor: string; monto: string; moneda: string; rubro: string };
  archivo: Archivo;
  meta: IaExtraccion;
  fiscal: DatosFiscales;
};

const tono = (c: string) => (c === "alta" ? "ok" : c === "media" ? "alerta" : "neutro");
const texto = (c: string) =>
  c === "alta" ? "Confianza alta" : c === "media" ? "Confianza media — revisa" : "Sin lectura — captura manual";

export function ExtraccionIA({ onConfirmar }: { onConfirmar: (r: ResultadoConfirmado) => void }) {
  const { estado, setEstado, registrar, usuarioActual } = useStore();
  const extraer = useServerFn(extraerComprobante);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null);
  const [archivo, setArchivo] = useState<Archivo | null>(null);
  const [editado, setEditado] = useState({ fecha: "", proveedor: "", monto: "", moneda: "MXN", rubro: "" });
  const [editadoFiscal, setEditadoFiscal] = useState<DatosFiscales>(FISCAL_VACIO);
  const [confFiscal, setConfFiscal] = useState<Record<string, string>>({});

  const acepto = estado.aceptaciones.some(
    (a) => a.usuarioId === usuarioActual.id && a.version === VERSION_CONSENTIMIENTO,
  );

  function aceptarConsentimiento() {
    setEstado((e) => ({
      ...e,
      aceptaciones: [
        ...e.aceptaciones,
        {
          id: nuevoId("ia"),
          usuarioId: usuarioActual.id,
          fecha: hoyISO(),
          version: VERSION_CONSENTIMIENTO,
        },
      ],
    }));
    registrar(
      "Consentimiento LFPDPPP (IA)",
      `Aceptó el procesamiento de comprobantes por ${SERVICIO_IA} (${VERSION_CONSENTIMIENTO}).`,
    );
  }

  async function procesar(lista: FileList | null) {
    const file = lista?.[0];
    if (!file) return;
    setPropuesta(null);
    setMensaje("");
    if (file.size > MAX_MB * 1024 * 1024) {
      setMensaje(`El archivo pesa más de ${MAX_MB} MB. Reduce su tamaño o captura los datos manualmente.`);
      return;
    }
    const esXml = file.type.includes("xml") || file.name.toLowerCase().endsWith(".xml");
    const leido = await new Promise<Archivo>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve({ nombre: file.name, tipo: file.type || "archivo", dataUrl: String(r.result) });
      r.onerror = () => resolve({ nombre: file.name, tipo: file.type || "archivo", dataUrl: "" });
      r.readAsDataURL(file);
    });
    const dup = await buscarDuplicado([leido], estado.gastos);
    if (dup) {
      setArchivo(null);
      setMensaje(mensajeDuplicado(leido.nombre, dup.coincidencia));
      return;
    }
    setArchivo(leido);
    setCargando(true);
    try {
      let p: Propuesta;
      let confianzaFiscal: Record<string, string> = {};
      if (esXml) {
        const xml = await file.text();
        p = leerCFDI(xml, estado.rubros);
      } else {
        const r = await extraer({
          data: {
            nombre: file.name,
            tipo: file.type,
            dataUrl: leido.dataUrl,
            rubros: estado.rubros,
            proveedores: estado.proveedores,
          },
        });
        if (!r.ok) {
          setMensaje(r.mensaje);
          setCargando(false);
          return;
        }
        const esFoto = /image\//.test(file.type) || /\.(jpe?g|png|heic)$/i.test(file.name);
        p = {
          campos: r.campos,
          confianza: r.confianza as Propuesta["confianza"],
          metodo: esFoto ? "Foto (corrección + OCR + IA)" : "PDF (OCR + IA)",
          modelo: r.modelo,
          fiscal: { ...FISCAL_VACIO, ...r.fiscal },
        };
        confianzaFiscal = r.confianza as Record<string, string>;
      }
      if (esXml) {
        const f = p.fiscal;
        confianzaFiscal = {
          subtotal: f.subtotal ? "alta" : "baja",
          iva: f.iva ? "alta" : "baja",
          uuidFiscal: f.uuidFiscal ? "alta" : "baja",
          rfcEmisor: f.rfcEmisor ? "alta" : "baja",
          rfcReceptor: f.rfcReceptor ? "alta" : "baja",
        };
      }
      setEditadoFiscal(p.fiscal);
      setConfFiscal(confianzaFiscal);
      const rubro = estado.rubros.find((x) => x.toLowerCase() === p.campos.rubro.toLowerCase()) ?? "";
      setPropuesta(p);
      setEditado({
        fecha: p.campos.fecha,
        proveedor: p.campos.proveedor,
        monto: p.campos.monto,
        moneda: ["MXN", "USD", "EUR"].includes(p.campos.moneda) ? p.campos.moneda : "MXN",
        rubro,
      });
      if (Object.values(p.confianza).every((c) => c === "baja"))
        setMensaje("No se pudo leer el documento con confianza. Captura los datos manualmente.");
    } catch {
      setMensaje("La extracción no estuvo disponible. Captura los datos manualmente.");
    } finally {
      setCargando(false);
    }
  }

  async function confirmar() {
    if (!propuesta || !archivo) return;
    const meta: IaExtraccion = {
      modelo: propuesta.modelo,
      metodo: propuesta.metodo,
      fecha: hoyISO(),
      archivo: archivo.nombre,
      hash: await huellaArchivo(archivo),
      confianza: propuesta.confianza,
      propuesto: { ...propuesta.campos, ...propuesta.fiscal },
      confirmado: { ...editado, ...editadoFiscal },
    };
    onConfirmar({
      campos: {
        proveedor: editado.proveedor,
        monto: editado.monto,
        moneda: editado.moneda,
        rubro: editado.rubro,
      },
      archivo,
      meta,
      fiscal: editadoFiscal,
    });
    registrar(
      "Confirmación de extracción IA",
      `${archivo.nombre} · propuesto: ${propuesta.campos.proveedor || "—"} ${propuesta.campos.monto || "—"} ${propuesta.campos.moneda || "—"} · confirmado: ${editado.proveedor || "—"} ${editado.monto || "—"} ${editado.moneda}.`,
    );
    setPropuesta(null);
    setArchivo(null);
    setEditadoFiscal(FISCAL_VACIO);
    setConfFiscal({});
    setMensaje("Datos confirmados y copiados al formulario. Revisa evento, participantes y justificación.");
  }

  return (
    <Panel>
      <TituloPanel sub="La IA solo propone; tú confirmas. Ningún dato se guarda sin tu confirmación.">
        Extracción inteligente de comprobantes
      </TituloPanel>

      {!acepto ? (
        <div className="grid gap-3">
          <Aviso tono="alerta">
            <strong>Consentimiento LFPDPPP.</strong> Tus documentos (facturas, tickets y pases de abordar) serán
            enviados a un servicio de IA externo: <strong>{SERVICIO_IA}</strong>, únicamente para transcribir sus
            datos. Se registra tu aceptación con fecha y hora para trazabilidad de datos personales conforme a la
            LFPDPPP. Puedes seguir capturando tus gastos manualmente sin aceptar.
          </Aviso>
          <div>
            <Boton type="button" onClick={aceptarConsentimiento}>
              Acepto el procesamiento por IA
            </Boton>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <Campo
            etiqueta="Comprobante a transcribir"
            id="ia-file"
            ayuda={`Formatos: XML (CFDI, lectura directa sin IA), PDF (OCR + IA), JPG/PNG/HEIC (corrección de imagen + OCR + IA). Máximo ${MAX_MB} MB por archivo.`}
          >
            <input
              id="ia-file"
              type="file"
              accept={FORMATOS}
              disabled={cargando}
              onChange={(e) => void procesar(e.target.files)}
              className="w-full rounded-md border-2 border-border-strong bg-input px-3 py-2 text-sm"
            />
          </Campo>

          {cargando ? <Aviso>Leyendo el comprobante… (máximo 30 segundos)</Aviso> : null}
          {mensaje ? <Aviso tono="alerta">{mensaje}</Aviso> : null}

          {propuesta ? (
            <div className="grid gap-3 rounded-lg border-2 border-border-strong bg-glass-strong p-3">
              <p className="text-sm">
                Método: <strong>{propuesta.metodo}</strong> · Modelo: <strong>{propuesta.modelo}</strong>
              </p>
              {propuesta.fiscal.subtotal || propuesta.fiscal.iva ? (
                <p className="text-sm">
                  Subtotal: <strong>{propuesta.fiscal.subtotal || "—"}</strong> · IVA:{" "}
                  <strong>{propuesta.fiscal.iva || "—"}</strong> · Total (importe que se comprueba):{" "}
                  <strong>{propuesta.campos.monto || "—"}</strong>
                </p>
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                <Campo etiqueta="Fecha del comprobante (referencia)" id="ia-fecha">
                  <Entrada
                    id="ia-fecha"
                    type="date"
                    value={editado.fecha}
                    onChange={(e) => setEditado({ ...editado, fecha: e.target.value })}
                  />
                  <p className="mt-1">
                    <Etiqueta tono={tono(propuesta.confianza.fecha)}>{texto(propuesta.confianza.fecha)}</Etiqueta>
                  </p>
                </Campo>
                <Campo etiqueta="Proveedor" id="ia-prov">
                  <Entrada
                    id="ia-prov"
                    value={editado.proveedor}
                    onChange={(e) => setEditado({ ...editado, proveedor: e.target.value })}
                  />
                  <p className="mt-1">
                    <Etiqueta tono={tono(propuesta.confianza.proveedor)}>
                      {texto(propuesta.confianza.proveedor)}
                    </Etiqueta>
                  </p>
                </Campo>
                <Campo etiqueta="Total del comprobante (moneda original)" id="ia-monto">
                  <Entrada
                    id="ia-monto"
                    type="number"
                    min={0}
                    step="0.01"
                    value={editado.monto}
                    onChange={(e) => setEditado({ ...editado, monto: e.target.value })}
                  />
                  <p className="mt-1">
                    <Etiqueta tono={tono(propuesta.confianza.monto)}>{texto(propuesta.confianza.monto)}</Etiqueta>
                  </p>
                </Campo>
                <Campo
                  etiqueta="Moneda"
                  id="ia-moneda"
                  ayuda="La IA no convierte a pesos: el tipo de cambio se captura aparte."
                >
                  <Selector
                    id="ia-moneda"
                    value={editado.moneda}
                    onChange={(e) => setEditado({ ...editado, moneda: e.target.value })}
                  >
                    <option value="MXN">MXN</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </Selector>
                  <p className="mt-1">
                    <Etiqueta tono={tono(propuesta.confianza.moneda)}>{texto(propuesta.confianza.moneda)}</Etiqueta>
                  </p>
                </Campo>
                <Campo etiqueta="Rubro del catálogo" id="ia-rubro">
                  <Selector
                    id="ia-rubro"
                    value={editado.rubro}
                    onChange={(e) => setEditado({ ...editado, rubro: e.target.value })}
                  >
                    <option value="">Selecciona un rubro…</option>
                    {estado.rubros.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </Selector>
                  <p className="mt-1">
                    <Etiqueta tono={tono(propuesta.confianza.rubro)}>{texto(propuesta.confianza.rubro)}</Etiqueta>
                  </p>
                </Campo>
              </div>
              <fieldset className="grid gap-3 rounded-lg border-2 border-border-strong p-3 md:grid-cols-2">
                <legend className="px-1 text-sm font-semibold">Datos fiscales de la factura</legend>
                {(
                  [
                    ["subtotal", "Subtotal (antes de impuestos)"],
                    ["iva", "IVA (impuestos trasladados)"],
                    ["uuidFiscal", "UUID fiscal (folio fiscal)"],
                    ["rfcEmisor", "RFC emisor"],
                    ["rfcReceptor", "RFC receptor"],
                  ] as [keyof DatosFiscales, string][]
                ).map(([k, etiqueta]) => (
                  <Campo key={k} etiqueta={etiqueta} id={`ia-${k}`}>
                    <Entrada
                      id={`ia-${k}`}
                      value={editadoFiscal[k]}
                      onChange={(e) => setEditadoFiscal({ ...editadoFiscal, [k]: e.target.value })}
                    />
                    <p className="mt-1">
                      <Etiqueta tono={tono(confFiscal[k] ?? "baja")}>{texto(confFiscal[k] ?? "baja")}</Etiqueta>
                    </p>
                  </Campo>
                ))}
              </fieldset>
              <div className="flex flex-wrap gap-2">
                <Boton type="button" onClick={() => void confirmar()}>
                  Confirmar datos
                </Boton>
                <Boton
                  type="button"
                  variante="neutro"
                  onClick={() => {
                    setPropuesta(null);
                    setArchivo(null);
                    setEditadoFiscal(FISCAL_VACIO);
                    setConfFiscal({});
                    setMensaje("Propuesta descartada. Captura los datos manualmente.");
                  }}
                >
                  Descartar y capturar manualmente
                </Boton>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Panel>
  );
}
