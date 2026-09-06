import { useState } from "react";
import { urlFirmada } from "@/lib/db";
import type { Archivo } from "@/lib/types";

/**
 * Abre un documento guardado en el almacén privado mediante un enlace firmado
 * temporal. Los archivos aún no subidos se abren desde la memoria del navegador.
 */
export function ArchivoEnlace({
  archivo,
  etiqueta,
}: {
  archivo: Archivo;
  etiqueta?: string;
}) {
  const [error, setError] = useState("");
  const [abriendo, setAbriendo] = useState(false);
  const texto = etiqueta ?? archivo.nombre;

  if (archivo.dataUrl) {
    return (
      <a
        className="text-sm font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        href={archivo.dataUrl}
        target="_blank"
        rel="noreferrer"
        download={archivo.nombre}
      >
        {texto}
      </a>
    );
  }

  if (!archivo.ruta) return <span className="text-sm">{archivo.nombre} (sin documento)</span>;

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={abriendo}
        className="text-sm font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        onClick={async () => {
          setAbriendo(true);
          setError("");
          try {
            const url = await urlFirmada(archivo.ruta as string);
            window.open(url, "_blank", "noopener");
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
          } finally {
            setAbriendo(false);
          }
        }}
      >
        {abriendo ? "Abriendo…" : texto}
      </button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </span>
  );
}
