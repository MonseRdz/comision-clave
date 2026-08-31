/** Lectura directa de CFDI (XML): texto estructurado, sin IA. */
export type PropuestaCampos = {
  fecha: string;
  proveedor: string;
  monto: string;
  moneda: string;
  rubro: string;
};

export type Confianza = "alta" | "media" | "baja";

/** Datos fiscales leídos del CFDI para trazabilidad y advertencias. */
export type DatosFiscales = {
  subtotal: string;
  iva: string;
  uuidFiscal: string;
  rfcEmisor: string;
  rfcReceptor: string;
  tipoCambio: string;
};

export const FISCAL_VACIO: DatosFiscales = {
  subtotal: "",
  iva: "",
  uuidFiscal: "",
  rfcEmisor: "",
  rfcReceptor: "",
  tipoCambio: "",
};

export type Propuesta = {
  campos: PropuestaCampos;
  confianza: Record<keyof PropuestaCampos, Confianza>;
  metodo: "CFDI XML (lectura directa)" | "PDF (OCR + IA)" | "Foto (corrección + OCR + IA)";
  modelo: string;
  fiscal: DatosFiscales;
};

/** Etiquetas de apertura cuyo nombre de nodo coincide exactamente (con o sin prefijo). */
const etiquetas = (xml: string, nodo: string): string[] =>
  Array.from(xml.matchAll(new RegExp(`<(?:[A-Za-z0-9_.-]+:)?${nodo}(\\s[^>]*)?/?>`, "gi"))).map((m) => m[0]);

/** Lee un atributo exacto de una etiqueta: "Total" nunca coincide con "SubTotal". */
const valor = (etiqueta: string, attr: string): string =>
  new RegExp(`(?:^|\\s)${attr}\\s*=\\s*"([^"]*)"`, "i").exec(etiqueta)?.[1] ?? "";

/** Primer valor no vacío del atributo entre todas las etiquetas con ese nombre de nodo. */
const atributo = (xml: string, nodo: string, attr: string): string => {
  for (const e of etiquetas(xml, nodo)) {
    const v = valor(e, attr);
    if (v) return v;
  }
  return "";
};

/**
 * Extrae los datos de un CFDI 4.0/3.3.
 * El monto propuesto es SIEMPRE el atributo Total del nodo raíz cfdi:Comprobante
 * (importe pagado), nunca SubTotal ni la suma de conceptos.
 */
export function leerCFDI(xml: string, rubros: string[]): Propuesta {
  const raiz = etiquetas(xml, "Comprobante")[0] ?? "";
  const fecha = valor(raiz, "Fecha").slice(0, 10);
  const total = valor(raiz, "Total");
  const subtotal = valor(raiz, "SubTotal");
  const moneda = valor(raiz, "Moneda") || "MXN";
  const tipoCambio = valor(raiz, "TipoCambio");
  const iva = atributo(xml, "Impuestos", "TotalImpuestosTrasladados");
  const uuidFiscal = atributo(xml, "TimbreFiscalDigital", "UUID");
  const proveedor = atributo(xml, "Emisor", "Nombre");
  const rfcEmisor = atributo(xml, "Emisor", "Rfc") || atributo(xml, "Emisor", "rfc");
  const rfcReceptor = atributo(xml, "Receptor", "Rfc") || atributo(xml, "Receptor", "rfc");
  const rubro = rubros.find((r) => xml.toLowerCase().includes(r.toLowerCase())) ?? "";
  const conf = (v: string): Confianza => (v ? "alta" : "baja");
  return {
    campos: { fecha, proveedor, monto: total, moneda, rubro },
    confianza: {
      fecha: conf(fecha),
      proveedor: conf(proveedor),
      monto: conf(total),
      moneda: conf(moneda),
      rubro: rubro ? "media" : "baja",
    },
    metodo: "CFDI XML (lectura directa)",
    modelo: "Parser CFDI local (sin IA)",
    fiscal: { subtotal, iva, uuidFiscal, rfcEmisor, rfcReceptor, tipoCambio },
  };
}
