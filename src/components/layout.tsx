import { Link, useRouterState } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Boton, Etiqueta, Aviso } from "@/components/glass";
import type { Rol } from "@/lib/types";
import logoAsset from "@/assets/Ademeba_Logo.png.asset.json";
import { SpriteIconos, Ico } from "@/components/iconos";

type Enlace = { a: string; texto: string; roles: Rol[] };

const ENLACES: Enlace[] = [
  { a: "/", texto: "Tablero", roles: ["Director", "Contralor", "Revisor"] },
  { a: "/reglas", texto: "Reglas", roles: ["Comisionado"] },
  { a: "/gastos", texto: "Registro de gastos", roles: ["Comisionado", "Contralor"] },
  { a: "/revision", texto: "Validación técnica", roles: ["Revisor"] },
  { a: "/aprobacion", texto: "Aprobación definitiva", roles: ["Contralor", "Director"] },
  { a: "/eventos", texto: "Eventos y participantes", roles: ["Contralor"] },
  { a: "/presupuestos", texto: "Presupuestos", roles: ["Contralor", "Director"] },
  { a: "/admin", texto: "Usuarios y configuración", roles: ["Contralor"] },
  { a: "/reportes", texto: "Reportes y expediente", roles: ["Contralor", "Director", "Revisor"] },
  { a: "/legal", texto: "Privacidad y términos", roles: ["Contralor", "Director", "Revisor", "Comisionado"] },
];

// El Director solo accede a estas consolas cuando el Contralor le delegó autoridad.
const SOLO_CON_DELEGACION = ["/presupuestos", "/aprobacion"];

export function Layout({ children }: { children: React.ReactNode }) {
  const { usuarioActual, delegacionVigente, perfiles, errorSync, cerrarSesion } = useStore();
  const pendientes = perfiles.filter((p) => p.estatus === "Pendiente" || !p.rol).length;
  const ruta = useRouterState({ select: (s) => s.location.pathname });
  const delegadoAlDirector =
    usuarioActual.rol === "Director" && delegacionVigente?.paraId === usuarioActual.id;
  const enlaces = ENLACES.filter(
    (e) =>
      e.roles.includes(usuarioActual.rol) &&
      (usuarioActual.rol !== "Director" || delegadoAlDirector || !SOLO_CON_DELEGACION.includes(e.a)),
  );

  return (
    <div className="min-h-screen">
      <SpriteIconos />
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:border focus:border-hair focus:bg-accent focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Saltar al contenido
      </a>
      <header className="glass-panel sticky top-0 z-40 m-3 rounded-2xl px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={logoAsset.url}
              alt="ADEMEBA"
              className="h-10 w-10 rounded-lg border border-hair bg-white object-contain p-0.5"
            />
            <div>
              <p className="titulo-tarjeta text-base leading-tight">Tresora Comprobación</p>
              <p className="text-xs text-muted-foreground">ADEMEBA · Justificación de recursos públicos</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold leading-tight">{usuarioActual.nombre}</p>
              <p className="text-xs text-muted-foreground">
                {usuarioActual.rol} · {usuarioActual.email}
              </p>
            </div>
            {usuarioActual.rol === "Contralor" && pendientes > 0 ? (
              <Link to="/admin">
                <Etiqueta tono="alerta">
                  {pendientes} solicitud{pendientes === 1 ? "" : "es"} de acceso
                </Etiqueta>
              </Link>
            ) : null}
            <Boton type="button" variante="neutro" onClick={() => void cerrarSesion()}>
              Cerrar sesión
            </Boton>
          </div>
        </div>
        {enlaces.length > 1 ? (
          <nav aria-label="Navegación principal" className="mt-3 flex flex-wrap gap-2">
            {enlaces.map((e) => {
              const activo = ruta === e.a;
              return (
                <Link
                  key={e.a}
                  to={e.a}
                  aria-current={activo ? "page" : undefined}
                  className={`titulo-tarjeta inline-flex items-center gap-1.5 rounded-[12px] px-3 py-1.5 text-xs ${
                    activo
                      ? "border border-transparent bg-accent text-white"
                      : "border border-hair bg-white text-ink shadow-[0_1px_2px_rgba(16,24,32,.045)]"
                  }`}
                >
                  {e.a === "/" ? (
                    <Ico nombre="i-score" className={`ico ${activo ? "text-white" : ""}`} />
                  ) : null}
                  {e.texto}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </header>
      <main id="contenido" className="mx-auto max-w-6xl px-3 pb-16">
        {errorSync ? (
          <div className="pt-4">
            <Aviso tono="alerta">{errorSync}</Aviso>
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
