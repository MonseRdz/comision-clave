import { createFileRoute } from "@tanstack/react-router";
import { DocumentosLegales } from "@/components/legal-pantalla";
import { VERSION_LEGAL } from "@/lib/legal";
import { useStore, fechaHora } from "@/lib/store";
import { descargarComprobanteLegal } from "@/lib/comprobante-legal";
import { Boton, Etiqueta, Panel, TituloPanel } from "@/components/glass";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Privacidad y Términos | Comprobación de Gastos ADEMEBA" },
      {
        name: "description",
        content:
          "Aviso de privacidad LFPDPPP y términos y condiciones de uso de la plataforma de comprobación de gastos de ADEMEBA.",
      },
      { property: "og:title", content: "Privacidad y Términos | Comprobación de Gastos ADEMEBA" },
      {
        property: "og:description",
        content: "Aviso de privacidad y reglas de buen uso de la información en ADEMEBA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LegalRoute,
});

function LegalRoute() {
  const { estado, usuarioActual } = useStore();
  const aceptacion = estado.aceptaciones.find(
    (a) => a.usuarioId === usuarioActual.id && a.version === VERSION_LEGAL,
  );

  return (
    <div className="mx-auto max-w-3xl pt-4">
      <div className="mb-4">
        <TituloPanel sub={`Versión vigente: ${VERSION_LEGAL}`}>
          Aviso de Privacidad y Términos y Condiciones
        </TituloPanel>
      </div>
      {aceptacion ? (
        <div className="mb-4">
          <Panel className="flex flex-wrap items-center gap-3">
            <Etiqueta tono="ok">Documentos aceptados</Etiqueta>
            <p className="text-sm">
              Aceptaste la versión {aceptacion.version} el {fechaHora(aceptacion.fecha)}.
            </p>
            <Boton
              type="button"
              variante="neutro"
              onClick={() =>
                descargarComprobanteLegal({
                  usuario: usuarioActual,
                  aceptacionId: aceptacion.id,
                  fechaISO: aceptacion.fecha,
                })
              }
            >
              Descargar comprobante PDF
            </Boton>
          </Panel>
        </div>
      ) : null}
      <DocumentosLegales />
    </div>
  );
}
