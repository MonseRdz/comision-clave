import { createServerFn } from "@tanstack/react-start";
import { MODELO_IA } from "./extraccion.functions";

type Entrada = {
  nombre: string;
  tipo: string;
  dataUrl: string;
  /** Nombre esperado del beneficiario según el tipo de desembolso elegido. */
  beneficiarioEsperado: string;
};

export type SalidaPago = {
  ok: boolean;
  mensaje: string;
  campos: {
    referencia: string;
    cuentaOrdenante: string;
    beneficiario: string;
    monto: string;
    fecha: string;
  };
  modelo: string;
};

const VACIO = (mensaje: string): SalidaPago => ({
  ok: false,
  mensaje,
  campos: { referencia: "", cuentaOrdenante: "", beneficiario: "", monto: "", fecha: "" },
  modelo: MODELO_IA,
});

/**
 * Lee un comprobante bancario de desembolso (CEP/SPEI, transferencia, cheque,
 * estado de cuenta) y propone los campos. No valida nada ante el SAT ni
 * afirma que el pago sea válido: solo transcribe para revisión humana.
 */
export const extraerPago = createServerFn({ method: "POST" })
  .inputValidator((d: Entrada) => d)
  .handler(async ({ data }): Promise<SalidaPago> => {
    const clave = process.env["LOVABLE_API_KEY"];
    if (!clave) return VACIO("El servicio de lectura no está configurado. Captura los datos manualmente.");
    if (!data.dataUrl.startsWith("data:")) return VACIO("Archivo ilegible. Captura los datos manualmente.");

    const esPdf = data.tipo.includes("pdf") || data.nombre.toLowerCase().endsWith(".pdf");
    const bloque = esPdf
      ? { type: "file", file: { filename: data.nombre, file_data: data.dataUrl } }
      : { type: "image_url", image_url: { url: data.dataUrl } };

    const instruccion = [
      "Transcribes comprobantes bancarios de pago mexicanos (CEP de SPEI, comprobante de transferencia,",
      "cheque o estado de cuenta). NO valides nada ante el SAT ni opines si el pago es válido.",
      "Transcribe TEXTUALMENTE, solo si aparecen literalmente:",
      "referencia (la 'Clave de rastreo' del CEP/SPEI; si no hay, la referencia numérica del pago),",
      "cuentaOrdenante (la cuenta o CLABE de quien ENVÍA el dinero),",
      "beneficiario (nombre de quien RECIBE el dinero),",
      "monto (importe del desembolso, solo dígitos y punto decimal),",
      "fecha (fecha de la operación en formato AAAA-MM-DD).",
      data.beneficiarioEsperado
        ? `El beneficiario esperado es aproximadamente: "${data.beneficiarioEsperado}". Si el documento muestra ese nombre (aunque escrito distinto), transcribe el nombre tal como aparece en el documento.`
        : "",
      "Si un dato no aparece, deja ese campo como cadena vacía. NUNCA inventes ni deduzcas datos.",
      'Responde solo JSON: {"referencia":"","cuentaOrdenante":"","beneficiario":"","monto":"","fecha":""}',
    ]
      .filter(Boolean)
      .join(" ");

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
            {
              role: "user",
              content: [{ type: "text", text: "Extrae los campos de este comprobante de pago." }, bloque],
            },
          ],
        }),
      });

      if (r.status === 429) return VACIO("El servicio de IA está saturado. Captura los datos manualmente.");
      if (r.status === 402) return VACIO("Sin créditos de IA disponibles. Captura los datos manualmente.");
      if (!r.ok) return VACIO(`El servicio de IA respondió ${r.status}. Captura los datos manualmente.`);

      const json = (await r.json()) as { choices?: { message?: { content?: string } }[] };
      const texto = json.choices?.[0]?.message?.content ?? "";
      const limpio = texto.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      const p = JSON.parse(limpio) as Record<string, unknown>;
      const s = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
      const fecha = s(p["fecha"]);

      return {
        ok: true,
        mensaje: "",
        campos: {
          referencia: s(p["referencia"]),
          cuentaOrdenante: s(p["cuentaOrdenante"]).replace(/\s+/g, ""),
          beneficiario: s(p["beneficiario"]),
          monto: s(p["monto"]).replace(/[^0-9.]/g, ""),
          fecha: /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : "",
        },
        modelo: MODELO_IA,
      };
    } catch (e) {
      const abortado = e instanceof Error && e.name === "AbortError";
      return VACIO(
        abortado
          ? "La lectura tardó demasiado. Captura los datos manualmente."
          : "No se pudo leer el comprobante de pago. Captura los datos manualmente.",
      );
    } finally {
      clearTimeout(reloj);
    }
  });
