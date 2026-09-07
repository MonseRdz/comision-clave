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
import { cargarDatos, cargarPerfiles, insertarBitacora, cargarGastosPorEstatus, type Perfil } from "./db";
import type { Estado, Gasto, Rol, Usuario } from "./types";
import { comprobadoDe, pendienteDe } from "./transporte";

export type Acceso = "cargando" | "anonimo" | "pendiente" | "activo";

type Ctx = {
  estado: Estado;
  /** Solo actualiza la copia en memoria. Toda escritura va antes a la base. */
  setEstado: (fn: (e: Estado) => Estado) => void;
  /** Asienta la bitácora en la base y la refleja en pantalla. */
  registrar: (accion: string, detalle: string) => Promise<void>;
  /** Refresca los gastos desde la base (fuente de verdad). */
  recargarGastos: () => Promise<void>;
  /** Refleja en memoria un gasto ya escrito y releído de la base. */
  aplicarGasto: (g: Gasto) => void;
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

const TODOS_ESTATUS: Gasto["estatus"][] = [
  "Borrador",
  "Registrado",
  "Validado por Revisor",
  "Devuelto para corrección",
  "Aprobado",
  "Rechazado",
];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [estado, setEstadoRaw] = useState<Estado>(estadoVacio);
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [acceso, setAcceso] = useState<Acceso>("cargando");
  const [listo, setListo] = useState(false);
  const [correoSesion, setCorreoSesion] = useState("");
  const [errorSync, setErrorSync] = useState("");
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
    setEstadoRaw({
      ...datos,
      usuarios: lista.filter((p) => p.rol).map(aUsuario),
      usuarioActualId: user.id,
    });
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

  const setEstado = useCallback((fn: (e: Estado) => Estado) => setEstadoRaw((e) => fn(e)), []);

  const recargarGastos = useCallback(async () => {
    try {
      const gastos = await cargarGastosPorEstatus(TODOS_ESTATUS);
      setEstadoRaw((e) => ({ ...e, gastos }));
      setErrorSync("");
    } catch (e: unknown) {
      setErrorSync(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const aplicarGasto = useCallback((g: Gasto) => {
    setEstadoRaw((e) => ({
      ...e,
      gastos: e.gastos.some((x) => x.id === g.id)
        ? e.gastos.map((x) => (x.id === g.id ? g : x))
        : [g, ...e.gastos],
    }));
  }, []);

  // Actualizaciones en vivo de gastos + refresco al volver a la pantalla.
  useEffect(() => {
    if (acceso !== "activo") return;
    const canal = supabase
      .channel("gastos-en-vivo")
      .on("postgres_changes", { event: "*", schema: "public", table: "gastos" }, () => {
        void recargarGastos();
      })
      .subscribe();
    const alEnfocar = () => void recargarGastos();
    window.addEventListener("focus", alEnfocar);
    return () => {
      window.removeEventListener("focus", alEnfocar);
      void supabase.removeChannel(canal);
    };
  }, [acceso, recargarGastos]);

  const registrar = useCallback(async (accion: string, detalle: string) => {
    const uid = usuarioIdRef.current;
    if (!uid) return;
    let actor = "Sistema";
    setEstadoRaw((e) => {
      const u = e.usuarios.find((x) => x.id === uid);
      if (u) actor = `${u.nombre} (${u.rol})`;
      return e;
    });
    try {
      const fila = await insertarBitacora({
        id: `l${Date.now()}${Math.random().toString(16).slice(2, 6)}`,
        fecha: hoyISO(),
        actor,
        actor_id: uid,
        accion,
        detalle,
      });
      setEstadoRaw((e) => ({ ...e, bitacora: [fila, ...e.bitacora] }));
      setErrorSync("");
    } catch (e: unknown) {
      setErrorSync(e instanceof Error ? e.message : String(e));
    }
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
        recargarGastos,
        aplicarGasto,
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

/**
 * Monto del gasto respaldado con evidencia suficiente. Fuera de Transporte es
 * el total; en Transporte solo la parte de los viajeros con pase de ida y de
 * regreso, y cero si no hay factura que ampare el total.
 */
export const montoComprobable = comprobadoDe;

/** Parte del gasto sin evidencia suficiente (pases faltantes o sin factura). */
export const pendientePorEvidencia = pendienteDe;

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
