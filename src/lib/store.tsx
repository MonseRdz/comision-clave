import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { cargarDatos, cargarPerfiles, instantanea, sincronizar, type Instantanea, type Perfil } from "./db";
import type { Estado, Gasto, Rol, Usuario } from "./types";

export type Acceso = "cargando" | "anonimo" | "pendiente" | "activo";

type Ctx = {
  estado: Estado;
  setEstado: (fn: (e: Estado) => Estado) => void;
  registrar: (accion: string, detalle: string) => void;
  usuarioActual: Usuario;
  puedeAprobar: boolean;
  delegacionVigente: Estado["delegaciones"][number] | undefined;
  listo: boolean;
  acceso: Acceso;
  perfiles: Perfil[];
  correoSesion: string;
  errorSync: string;
  recargar: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
};

// Conserva una sola identidad del contexto aunque Vite vuelva a evaluar este
// módulo durante HMR. Sin esto, un Provider antiguo y un useStore recién
// cargado pueden apuntar temporalmente a contextos distintos.
const STORE_CONTEXT_KEY = Symbol.for("ademeba.store-context");
const contextoGlobal = globalThis as typeof globalThis & {
  [STORE_CONTEXT_KEY]?: ReturnType<typeof createContext<Ctx | null>>;
};
const StoreContext =
  contextoGlobal[STORE_CONTEXT_KEY] ??
  (contextoGlobal[STORE_CONTEXT_KEY] = createContext<Ctx | null>(null));

export function hoyISO() {
  return new Date().toISOString();
}

function estadoVacio(): Estado {
  return {
    usuarios: [],
    eventos: [],
    presupuestos: [],
    gastos: [],
    delegaciones: [],
    bitacora: [],
    aceptaciones: [],
    rubros: [],
    motivosRechazo: [],
    justificacionesSinCFDI: [],
    proveedores: [],
    topeSinComprobante: 2000,
    rfcAdemeba: "",
    versionReglas: "ADEMEBA v1.0",
    usuarioActualId: "",
  };
}

export function delegacionVigenteDe(estado: Estado) {
  const hoy = new Date().toISOString().slice(0, 10);
  return estado.delegaciones.find(
    (d) => d.estatus === "Vigente" && d.fechaInicio <= hoy && d.fechaFin >= hoy,
  );
}

const aUsuario = (p: Perfil): Usuario => ({
  id: p.id,
  nombre: p.nombre,
  email: p.email,
  rol: (p.rol ?? "Comisionado") as Rol,
  activo: p.estatus === "Aprobado",
});

export function StoreProvider({ children }: { children: ReactNode }) {
  const [estado, setEstadoRaw] = useState<Estado>(estadoVacio);
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [acceso, setAcceso] = useState<Acceso>("cargando");
  const [listo, setListo] = useState(false);
  const [correoSesion, setCorreoSesion] = useState("");
  const [errorSync, setErrorSync] = useState("");
  const snapRef = useRef<Instantanea>({});
  const colaRef = useRef<Promise<unknown>>(Promise.resolve());
  const usuarioIdRef = useRef<string>("");

  const cargar = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      usuarioIdRef.current = "";
      setCorreoSesion("");
      setPerfiles([]);
      setEstadoRaw(estadoVacio());
      setAcceso("anonimo");
      setListo(true);
      return;
    }
    usuarioIdRef.current = user.id;
    setCorreoSesion(user.email ?? "");

    const lista = await cargarPerfiles();
    setPerfiles(lista);
    const mio = lista.find((p) => p.id === user.id);

    if (!mio || mio.estatus !== "Aprobado" || !mio.rol) {
      setEstadoRaw(estadoVacio());
      setAcceso("pendiente");
      setListo(true);
      return;
    }

    const datos = await cargarDatos();
    const nuevo: Estado = {
      ...datos,
      usuarios: lista.filter((p) => p.rol).map(aUsuario),
      usuarioActualId: user.id,
    };
    snapRef.current = instantanea(nuevo);
    setEstadoRaw(nuevo);
    setAcceso("activo");
    setListo(true);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_IN" || evento === "SIGNED_OUT" || evento === "USER_UPDATED") {
        setListo(false);
        void cargar();
      }
    });
    void cargar();
    return () => sub.subscription.unsubscribe();
  }, [cargar]);

  // Persistencia incremental: solo se escribe lo que cambió.
  useEffect(() => {
    if (!listo || acceso !== "activo") return;
    colaRef.current = colaRef.current
      .then(async () => {
        snapRef.current = await sincronizar(estado, snapRef.current);
        setErrorSync("");
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        setErrorSync(`No se pudo guardar en el servidor. ${msg}`);
      });
  }, [estado, listo, acceso]);

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
            actor_id: e.usuarioActualId,
            accion,
            detalle,
          },
          ...e.bitacora,
        ],
      };
    });
  }, []);

  const cerrarSesion = useCallback(async () => {
    await supabase.auth.signOut();
    setAcceso("anonimo");
  }, []);

  const usuarioActual = useMemo<Usuario>(() => {
    const mio = perfiles.find((p) => p.id === usuarioIdRef.current);
    return mio
      ? aUsuario(mio)
      : { id: "", nombre: "", email: correoSesion, rol: "Comisionado", activo: false };
  }, [perfiles, correoSesion]);

  const delegacion = useMemo(() => delegacionVigenteDe(estado), [estado]);

  const puedeAprobar =
    usuarioActual.rol === "Contralor" ||
    (usuarioActual.rol === "Director" && delegacion?.paraId === usuarioActual.id);

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
        acceso,
        perfiles,
        correoSesion,
        errorSync,
        recargar: cargar,
        cerrarSesion,
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

/** Un borrador aún no es un gasto ejercido: no cuenta en presupuestos, tablero ni reportes. */
export const esBorrador = (g: Gasto) => g.estatus === "Borrador";

/** Criterio estricto: solo lo dictaminado y aprobado cuenta como comprobado. */
export const cuentaComprobado = (g: Gasto) => g.estatus === "Aprobado";

/** Gastos presentados y en proceso de dictamen (no comprobados todavía). */
export const cuentaEnDictamen = (g: Gasto) =>
  g.estatus === "Registrado" ||
  g.estatus === "Validado por Revisor" ||
  g.estatus === "Devuelto para corrección";

/** Gastos aún en poder del comisionado. */
export const cuentaBorrador = (g: Gasto) => g.estatus === "Borrador";

/** Gastos presentados y aún sin dictamen final. */
export const estaPendiente = (g: Gasto) =>
  g.estatus !== "Borrador" && g.estatus !== "Aprobado" && g.estatus !== "Rechazado";

export const nuevoId = (p: string) => `${p}${Date.now()}${Math.random().toString(16).slice(2, 5)}`;
