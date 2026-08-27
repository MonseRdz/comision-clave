/** Lectura directa de CFDI (XML): texto estructurado, sin IA. */
export type PropuestaCampos = {
  fecha: string;
  proveedor: string;
  monto: string;
  moneda: string;
  rubro: string;
};

export type Confianza = "alta" | "media" | "baja";

export type Propuesta = {
  campos: PropuestaCampos;
  confianza: Record<keyof PropuestaCampos, Confianza>;
  metodo: "CFDI XML (lectura directa)" | "PDF (OCR + IA)" | "Foto (corrección + OCR + IA)";
  modelo: string;
};

const atributo = (xml: string, etiqueta: string, attr: string) => {
  const bloque = new RegExp(`<[^>]*${etiqueta}[^>]*>`, "i").exec(xml)?.[0] ?? "";
  return new RegExp(`${attr}="([^"]*)"`, "i").exec(bloque)?.[1] ?? "";
};

/** Extrae Fecha, Proveedor, Monto y Moneda de un CFDI 4.0/3.3. */
export function leerCFDI(xml: string, rubros: string[]): Propuesta {
  const fecha = (atributo(xml, "Comprobante", "Fecha") || "").slice(0, 10);
  const total = atributo(xml, "Comprobante", "Total");
  const moneda = atributo(xml, "Comprobante", "Moneda") || "MXN";
  const proveedor = atributo(xml, "Emisor", "Nombre");
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
  };
}
