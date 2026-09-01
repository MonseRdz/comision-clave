import { createFileRoute } from "@tanstack/react-router";
import { ReglasPantalla } from "@/components/reglas-pantalla";

export const Route = createFileRoute("/reglas")({
  head: () => ({
    meta: [
      { title: "Reglas institucionales | Tresora Comprobación" },
      {
        name: "description",
        content: "Reglas de ADEMEBA que el comisionado debe aceptar antes de comprobar gastos.",
      },
      { property: "og:title", content: "Reglas institucionales | Tresora Comprobación" },
      {
        property: "og:description",
        content: "Aceptación formal de normativas con registro de fecha, hora y versión.",
      },
    ],
  }),
  component: ReglasPantalla,
});
