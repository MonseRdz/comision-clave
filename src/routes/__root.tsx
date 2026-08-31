import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { StoreProvider, useStore } from "@/lib/store";
import { Layout } from "@/components/layout";
import { ReglasPantalla } from "@/components/reglas-pantalla";
import { LegalPantalla } from "@/components/legal-pantalla";
import { VERSION_LEGAL } from "@/lib/legal";
import { AuthPantalla, PendientePantalla } from "@/components/auth-pantalla";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-panel max-w-md p-8 text-center">
        <h1 className="text-6xl font-black text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscas no existe o fue movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="btn-base bg-accent text-white"
          >
            Ir al tablero
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-panel max-w-md p-8 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Esta página no cargó</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocurrió un problema. Puedes intentar de nuevo o volver al inicio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn-base bg-accent text-white"
          >
            Intentar de nuevo
          </button>
          <a href="/" className="btn-base bg-white text-ink">
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Comprobación de Gastos | ADEMEBA" },
      {
        name: "description",
        content:
          "Plataforma para comprobar gastos de eventos deportivos con CFDI, evidencia nominal y dictamen.",
      },
      { property: "og:title", content: "Comprobación de Gastos | ADEMEBA" },
      {
        property: "og:description",
        content: "Control de comprobación de recursos públicos para asociaciones deportivas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&family=Archivo:wdth,wght@100..125,500..700&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Contenido() {
  const { estado, usuarioActual, listo, acceso } = useStore();
  const router = useRouter();
  const enRecuperacion = router.state.location.pathname.startsWith("/reset-password");
  if (enRecuperacion) return <Outlet />;
  if (!listo || acceso === "cargando") {
    return <p className="p-6 text-sm text-muted-foreground">Cargando…</p>;
  }
  if (acceso === "anonimo") return <AuthPantalla />;
  if (acceso === "pendiente") return <PendientePantalla />;

  const debeAceptarLegal = !estado.aceptaciones.some(
    (a) => a.usuarioId === usuarioActual.id && a.version === VERSION_LEGAL,
  );

  const debeAceptar =
    usuarioActual.rol === "Comisionado" &&
    !estado.aceptaciones.some(
      (a) => a.usuarioId === usuarioActual.id && a.version === estado.versionReglas,
    );

  return (
    <Layout>
      {debeAceptarLegal ? <LegalPantalla /> : debeAceptar ? <ReglasPantalla /> : <Outlet />}
    </Layout>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Contenido />
      </StoreProvider>
    </QueryClientProvider>
  );
}
