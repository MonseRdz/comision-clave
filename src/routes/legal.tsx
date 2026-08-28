import { createFileRoute } from "@tanstack/react-router";
import { DocumentosLegales } from "@/components/legal-pantalla";
import { VERSION_LEGAL } from "@/lib/legal";
import { TituloPanel } from "@/components/glass";

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
  return (
    <div className="mx-auto max-w-3xl pt-4">
      <div className="mb-4">
        <TituloPanel sub={`Versión vigente: ${VERSION_LEGAL}`}>
          Aviso de Privacidad y Términos y Condiciones
        </TituloPanel>
      </div>
      <DocumentosLegales />
    </div>
  );
}
