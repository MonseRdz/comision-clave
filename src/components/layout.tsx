import { Link, useRouterState } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Selector } from "@/components/glass";
import type { Rol } from "@/lib/types";
import logoAsset from "@/assets/Ademeba_Logo.png.asset.json";

type Enlace = { a: string; texto: string; roles: Rol[] };

const ENLACES: Enlace[] = [
  { a: "/", texto: "Tablero", roles: ["Director", "Contralor", "Administrador", "Revisor"] },
  { a: "/reglas", texto: "Reglas", roles: ["Comisionado"] },
  { a: "/gastos", texto: "Registro de gastos", roles: ["Comisionado", "Administrador"] },
  { a: "/revision", texto: "Validación técnica", roles: ["Revisor"] },
  { a: "/aprobacion", texto: "Aprobación definitiva", roles: ["Contralor", "Director"] },
  { a: "/eventos", texto: "Eventos y participantes", roles: ["Administrador", "Contralor", "Director"] },
  { a: "/presupuestos", texto: "Presupuestos", roles: ["Administrador", "Contralor", "Director"] },
  { a: "/admin", texto: "Usuarios y configuración", roles: ["Administrador"] },
  { a: "/reportes", texto: "Reportes y expediente", roles: ["Administrador", "Contralor", "Director", "Revisor"] },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { estado, setEstado, usuarioActual, registrar } = useStore();
  const ruta = useRouterState({ select: (s) => s.location.pathname });
  const enlaces = ENLACES.filter((e) => e.roles.includes(usuarioActual.rol));

  return (
    <div className="min-h-screen">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:border-2 focus:border-border-strong focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Saltar al contenido
      </a>
      <header className="glass-panel sticky top-0 z-40 m-3 rounded-2xl px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={logoAsset.url}
              alt="ADEMEBA"
              className="h-10 w-10 rounded-lg border-2 border-border-strong bg-white object-contain p-0.5"
            />
            <div>
              <p className="text-base font-black leading-tight">Comprobación de Gastos</p>
              <p className="text-xs text-muted-foreground">ADEMEBA · Justificación de recursos públicos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="usuario-activo" className="text-sm font-semibold">
              Sesión:
            </label>
            <Selector
              id="usuario-activo"
              className="w-auto"
              value={estado.usuarioActualId}
              onChange={(ev) => {
                const id = ev.target.value;
                setEstado((e) => ({ ...e, usuarioActualId: id }));
                const u = estado.usuarios.find((x) => x.id === id);
                registrar("Cambio de sesión", `Ingresó ${u?.nombre} (${u?.rol}).`);
              }}
            >
              {estado.usuarios
                .filter((u) => u.activo)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} — {u.rol}
                  </option>
                ))}
            </Selector>
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
                  className={`rounded-md border-2 border-border-strong px-3 py-1.5 text-sm font-semibold ${
                    activo ? "bg-primary text-primary-foreground" : "bg-glass-strong text-foreground"
                  }`}
                >
                  {e.texto}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </header>
      <main id="contenido" className="mx-auto max-w-6xl px-3 pb-16">
        {children}
      </main>
    </div>
  );
}
