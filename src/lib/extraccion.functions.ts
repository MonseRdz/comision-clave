import { createServerFn } from "@tanstack/react-start";

export const MODELO_IA = "google/gemini-3.7-flash";
export const SERVICIO_IA = "Lovable AI Gateway (Google Gemini)";

type Entrada = {
  nombre: string;
  tipo: string;
  dataUrl: string;
  rubros: string[];
  proveedores: string[];
};

type Nivel = "alta" | "media" | "baja";

type Salida = {
  ok: boolean;
  mensaje: string;
  campos: { fecha: string; proveedor: string; monto: string; moneda: string; rubro: string };
  /** Datos fiscales de factura. Nunca se calculan: si no se leen, quedan vacíos. */
  fiscal: { subtotal: string; iva: string; uuidFiscal: string; rfcEmisor: string; rfcReceptor: string };
  confianza: Record<string, Nivel>;
  modelo: string;
};

const CLAVES_FISCALES = ["subtotal", "iva", "uuidFiscal", "rfcEmisor", "rfcReceptor"] as const;

const vacio = (mensaje: string): Salida => ({
  ok: false,
  mensaje,
  campos: { fecha: "", proveedor: "", monto: "", moneda: "", rubro: "" },
  fiscal: { subtotal: "", iva: "", uuidFiscal: "", rfcEmisor: "", rfcReceptor: "" },
  confianza: {
    fecha: "baja",
    proveedor: "baja",
    monto: "baja",
    moneda: "baja",
    rubro: "baja",
    subtotal: "baja",
    iva: "baja",
    uuidFiscal: "baja",
    rfcEmisor: "baja",
    rfcReceptor: "baja",
  },
  modelo: MODELO_IA,
});

/** Transcribe un comprobante (PDF o foto) y propone campos. Nunca guarda nada. */
export const extraerComprobante = createServerFn({ method: "POST" })
  .inputValidator((d: Entrada) => d)
  .handler(async ({ data }): Promise<Salida> => {
    const clave = process.env["LOVABLE_API_KEY"];
    if (!clave) return vacio("El servicio de extracción no está configurado. Captura los datos manualmente.");
    if (!data.dataUrl.startsWith("data:")) return vacio("Archivo ilegible. Captura los datos manualmente.");

    const esPdf = data.tipo.includes("pdf") || data.nombre.toLowerCase().endsWith(".pdf");
    const bloque = esPdf
      ? { type: "file", file: { filename: data.nombre, file_data: data.dataUrl } }
      : { type: "image_url", image_url: { url: data.dataUrl } };

    const instruccion = [
      "Eres un asistente de comprobación de gastos de una asociación deportiva mexicana.",
      "Transcribe TEXTUALMENTE del documento: fecha del gasto (AAAA-MM-DD), proveedor o emisor,",
      "monto total y moneda original (MXN, USD, EUR, etc.) tal como aparecen.",
      "El campo monto es SIEMPRE el total pagado del comprobante.",
      "NO conviertas moneda ni calcules equivalentes en pesos.",
      "Si el documento es una factura (CFDI), transcribe además, solo si aparecen literalmente:",
      "subtotal (importe antes de impuestos), iva (total de impuestos trasladados),",
      "uuidFiscal (folio fiscal: UUID de 36 caracteres con guiones), rfcEmisor (RFC de quien emite)",
      "y rfcReceptor (RFC de quien recibe).",
      "NUNCA calcules ni deduzcas datos: si solo ves el total, deja subtotal e iva vacíos;",
      "jamás dividas entre 1.16 ni estimes impuestos.",
      `Elige el rubro más cercano de este catálogo: ${data.rubros.join(", ") || "sin catálogo"}.`,
      `Si el proveedor coincide con alguno del catálogo, usa ese nombre exacto: ${data.proveedores.join(", ") || "sin catálogo"}.`,
      "Para cada campo indica confianza: alta, media o baja. Si no lo lees, deja el campo vacío y confianza baja.",
      'Responde solo JSON: {"fecha":"","proveedor":"","monto":"","moneda":"","rubro":"","subtotal":"","iva":"","uuidFiscal":"","rfcEmisor":"","rfcReceptor":"","confianza":{"fecha":"alta","proveedor":"alta","monto":"alta","moneda":"alta","rubro":"media","subtotal":"alta","iva":"alta","uuidFiscal":"alta","rfcEmisor":"alta","rfcReceptor":"alta"}}',
    ].join(" ");

    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), 28000);
    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        signal: control.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${clave}` },
        body: JSON.stringify({
          model: MODELO_IA,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: instruccion },
            { role: "user", content: [{ type: "text", text: "Extrae los campos de este comprobante." }, bloque] },
          ],
        }),
      });

      if (r.status === 429) return vacio("El servicio de IA está saturado. Captura los datos manualmente.");
      if (r.status === 402) return vacio("Sin créditos de IA disponibles. Captura los datos manualmente.");
      if (!r.ok) return vacio(`El servicio de IA respondió ${r.status}. Captura los datos manualmente.`);

      const json = (await r.json()) as { choices?: { message?: { content?: string } }[] };
      const texto = json.choices?.[0]?.message?.content ?? "";
      const limpio = texto.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      const p = JSON.parse(limpio) as Record<string, unknown>;
      const s = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
      const c = (p["confianza"] ?? {}) as Record<string, string>;
      const nivel = (k: string): Nivel => (c[k] === "alta" || c[k] === "media" ? c[k] : "baja");

      const numero = (v: unknown) => s(v).replace(/[^0-9.]/g, "");
      const uuid = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/;
      const uuidLeido = s(p["uuidFiscal"]).toUpperCase();
      const fiscal = {
        subtotal: numero(p["subtotal"]),
        iva: numero(p["iva"]),
        uuidFiscal: uuid.test(uuidLeido) ? uuidLeido : "",
        rfcEmisor: s(p["rfcEmisor"]).toUpperCase(),
        rfcReceptor: s(p["rfcReceptor"]).toUpperCase(),
      };

      const confianza: Record<string, Nivel> = {
        fecha: nivel("fecha"),
        proveedor: nivel("proveedor"),
        monto: nivel("monto"),
        moneda: nivel("moneda"),
        rubro: nivel("rubro"),
      };
      // Un campo fiscal sin lectura siempre queda en confianza baja.
      for (const k of CLAVES_FISCALES) confianza[k] = fiscal[k] ? nivel(k) : "baja";

      return {
        ok: true,
        mensaje: "",
        campos: {
          fecha: s(p["fecha"]),
          proveedor: s(p["proveedor"]),
          monto: numero(p["monto"]),
          moneda: s(p["moneda"]).toUpperCase(),
          rubro: s(p["rubro"]),
        },
        fiscal,
        confianza,
        modelo: MODELO_IA,
      };
    } catch (e) {
      const abortado = e instanceof Error && e.name === "AbortError";
      return vacio(
        abortado
          ? "La IA tardó más de 30 segundos. Captura los datos manualmente."
          : "No se pudo leer el comprobante con IA. Captura los datos manualmente.",
      );
    } finally {
      clearTimeout(reloj);
    }
  });
