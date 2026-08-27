import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { Panel, TituloPanel, Boton, Campo, Entrada, Aviso, Etiqueta } from "@/components/glass";
import logoAsset from "@/assets/Ademeba_Logo.png.asset.json";

const esquema = z.object({
  nombre: z.string().trim().min(3, "Escribe tu nombre completo.").max(100),
  email: z.string().trim().email("Correo electrónico inválido.").max(255),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(72),
});

function Encabezado({ sub }: { sub: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <img
        src={logoAsset.url}
        alt="ADEMEBA"
        className="h-12 w-12 rounded-lg border-2 border-border-strong bg-white object-contain p-0.5"
      />
      <div>
        <h1 className="text-lg font-black leading-tight">Comprobación de Gastos</h1>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

export function AuthPantalla() {
  const [modo, setModo] = useState<"entrar" | "solicitar" | "recuperar">("entrar");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setError("");
    setAviso("");

    if (modo === "recuperar") {
      const correo = z.string().trim().email().max(255).safeParse(email);
      if (!correo.success) return setError("Correo electrónico inválido.");
      setOcupado(true);
      try {
        const { error: err } = await supabase.auth.resetPasswordForEmail(correo.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (err) setError(`No fue posible enviar el correo: ${err.message}`);
        else
          setAviso(
            "Si el correo está registrado, recibirás un enlace para definir una nueva contraseña.",
          );
      } finally {
        setOcupado(false);
      }
      return;
    }

    const datos = esquema.safeParse({
      nombre: modo === "solicitar" ? nombre : "Sesión",
      email,
      password,
    });
    if (!datos.success) return setError(datos.error.issues[0]?.message ?? "Datos inválidos.");

    setOcupado(true);

    try {
      if (modo === "entrar") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: datos.data.email,
          password: datos.data.password,
        });
        if (err) {
          setError(
            err.message.includes("Invalid login")
              ? "Correo o contraseña incorrectos."
              : `No fue posible iniciar sesión: ${err.message}`,
          );
        }
      } else {
        const { error: err } = await supabase.auth.signUp({
          email: datos.data.email,
          password: datos.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { nombre: datos.data.nombre },
          },
        });
        if (err) {
          setError(
            err.message.includes("already registered")
              ? "Ese correo ya tiene una solicitud o cuenta registrada."
              : `No fue posible registrar la solicitud: ${err.message}`,
          );
        } else {
          setAviso(
            "Solicitud enviada. El Contralor recibirá tu solicitud para aprobarla y asignarte un rol.",
          );
        }
      }
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-3 py-10">
      <Panel>
        <Encabezado sub="ADEMEBA · Acceso controlado" />
        <div className="mb-4 flex gap-2">
          <Boton
            type="button"
            variante={modo === "entrar" ? "primario" : "neutro"}
            onClick={() => {
              setModo("entrar");
              setError("");
              setAviso("");
            }}
          >
            Iniciar sesión
          </Boton>
          <Boton
            type="button"
            variante={modo === "solicitar" ? "primario" : "neutro"}
            onClick={() => {
              setModo("solicitar");
              setError("");
              setAviso("");
            }}
          >
            Solicitar acceso
          </Boton>
        </div>

        <TituloPanel
          sub={
            modo === "entrar"
              ? "Ingresa con el correo y la contraseña de tu cuenta autorizada."
              : modo === "solicitar"
                ? "Registra tu solicitud; el Contralor la aprueba y te asigna un rol."
                : "Te enviaremos un enlace para definir una nueva contraseña."
          }
        >
          {modo === "entrar"
            ? "Acceso al sistema"
            : modo === "solicitar"
              ? "Solicitud de acceso"
              : "Recuperar contraseña"}
        </TituloPanel>

        {error ? <Aviso tono="alerta">{error}</Aviso> : null}
        {aviso ? <Aviso>{aviso}</Aviso> : null}

        <form onSubmit={enviar} className="mt-3 grid gap-3">
          {modo === "solicitar" ? (
            <Campo etiqueta="Nombre completo" id="acc-nombre">
              <Entrada
                id="acc-nombre"
                value={nombre}
                autoComplete="name"
                onChange={(e) => setNombre(e.target.value)}
              />
            </Campo>
          ) : null}
          <Campo etiqueta="Correo electrónico" id="acc-email">
            <Entrada
              id="acc-email"
              type="email"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </Campo>
          {modo === "recuperar" ? null : (
            <Campo
              etiqueta="Contraseña"
              id="acc-password"
              {...(modo === "solicitar" ? { ayuda: "Mínimo 8 caracteres." } : {})}
            >
              <Entrada
                id="acc-password"
                type="password"
                value={password}
                autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Campo>
          )}
          <Boton type="submit" disabled={ocupado}>
            {ocupado
              ? "Procesando…"
              : modo === "entrar"
                ? "Entrar"
                : modo === "solicitar"
                  ? "Enviar solicitud"
                  : "Enviar enlace de recuperación"}
          </Boton>
          {modo === "recuperar" ? (
            <button
              type="button"
              className="text-sm underline"
              onClick={() => {
                setModo("entrar");
                setError("");
                setAviso("");
              }}
            >
              Volver al inicio de sesión
            </button>
          ) : (
            <button
              type="button"
              className="text-sm underline"
              onClick={() => {
                setModo("recuperar");
                setError("");
                setAviso("");
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </form>

      </Panel>
    </div>
  );
}

export function PendientePantalla() {
  const { correoSesion, cerrarSesion, recargar } = useStore();
  return (
    <div className="mx-auto max-w-md px-3 py-10">
      <Panel>
        <Encabezado sub="ADEMEBA · Solicitud en revisión" />
        <TituloPanel sub="Tu cuenta existe, pero aún no tiene rol autorizado.">
          Esperando aprobación del Contralor
        </TituloPanel>
        <Aviso tono="alerta">
          El Contralor debe aprobar tu acceso y asignarte un rol. Vuelve a intentarlo más tarde.
        </Aviso>
        <p className="mt-3 text-sm">
          Sesión: <Etiqueta tono="marca">{correoSesion}</Etiqueta>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Boton type="button" onClick={() => void recargar()}>
            Revisar de nuevo
          </Boton>
          <Boton type="button" variante="neutro" onClick={() => void cerrarSesion()}>
            Cerrar sesión
          </Boton>
        </div>
      </Panel>
    </div>
  );
}
