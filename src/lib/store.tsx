import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { estadoInicial } from "./seed";
import type { Estado, Gasto } from "./types";

const CLAVE = "comprobacion-gastos-v1";

type Ctx = {
  estado: Estado;
  setEstado: (fn: (e: Estado) => Estado) => void;
  registrar: (accion: string, detalle: string) => void;
  usuarioActual: Estado["usuarios"][number];
  puedeAprobar: boolean;
  delegacionVigente: Estado["delegaciones"][number] | undefined;
  listo: boolean;
};

const StoreContext = createContext<Ctx | null>(null);

export function hoyISO() {
  return new Date().toISOString();
}

export function delegacionVigenteDe(estado: Estado) {
  const hoy = new Date().toISOString().slice(0, 10);
  return estado.delegaciones.find(
    (d) => d.estatus === "Vigente" && d.fechaInicio <= hoy && d.fechaFin >= hoy,
  );
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [estado, setEstadoRaw] = useState<Estado>(() => estadoInicial());
  const [listo, setListo] = useState(false);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE);
      if (guardado) setEstadoRaw(JSON.parse(guardado) as Estado);
    } catch {
      /* estado por defecto */
    }
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(estado));
    } catch {
      /* almacenamiento lleno */
    }
  }, [estado, listo]);

  const setEstado = useCallback((fn: (e: Estado) => Estado) => setEstadoRaw((e) => fn(e)), []);

  const registrar = useCallback((accion: string, detalle: string) => {
    setEstadoRaw((e) => {
      const actor = e.usuarios.find((u) => u.id === e.usuarioActualId);
      return {
        ...e,
        bitacora: [
          {
            id: `l${Date.now()}${Math.random().toString(16).slice(2, 6)}`,
            fecha: hoyISO(),
            actor: actor ? `${actor.nombre} (${actor.rol})` : "Sistema",
            accion,
            detalle,
          },
          ...e.bitacora,
        ],
      };
    });
  }, []);

  const usuarioActual = useMemo(
    () => estado.usuarios.find((u) => u.id === estado.usuarioActualId) ?? estado.usuarios[0],
    [estado],
  );

  const delegacion = useMemo(() => delegacionVigenteDe(estado), [estado]);

  const puedeAprobar =
    usuarioActual?.rol === "Contralor" ||
    (usuarioActual?.rol === "Director" && delegacion?.paraId === usuarioActual.id);

  return (
    <StoreContext.Provider
      value={{
        estado,
        setEstado,
        registrar,
        usuarioActual,
        puedeAprobar,
        delegacionVigente: delegacion,
        listo,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}

export const mxn = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);

export const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

export const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });

export const diasDesde = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

export const esInmutable = (g: Gasto) => g.estatus === "Aprobado" || g.estatus === "Rechazado";

export const nuevoId = (p: string) => `${p}${Date.now()}${Math.random().toString(16).slice(2, 5)}`;
