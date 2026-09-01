import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Panel, TituloPanel, Boton, Campo, Entrada, Aviso } from "@/components/glass";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Restablecer contraseña | Tresora Comprobación" },
      {
        name: "description",
        content: "Define una nueva contraseña de acceso al sistema de comprobación de gastos.",
      },
      { property: "og:title", content: "Restablecer contraseña | Tresora Comprobación" },
      {
        property: "og:description",
        content: "Página segura para definir una nueva contraseña de acceso.",
      },
    ],
  }),
  component: RestablecerPantalla,
});

function RestablecerPantalla() {
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setError("");
    setAviso("");
    if (password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    if (password !== confirmar) return setError("Las contraseñas no coinciden.");

    setOcupado(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(
          err.message.includes("Auth session missing")
            ? "El enlace de recuperación expiró o no es válido. Solicita uno nuevo."
            : `No fue posible actualizar la contraseña: ${err.message}`,
        );
      } else {
        setAviso("Contraseña actualizada. Ya puedes entrar al sistema.");
      }
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-3 py-10">
      <Panel>
        <TituloPanel sub="Escribe tu nueva contraseña de acceso.">Restablecer contraseña</TituloPanel>
        {error ? <Aviso tono="alerta">{error}</Aviso> : null}
        {aviso ? <Aviso>{aviso}</Aviso> : null}
        <form onSubmit={enviar} className="mt-3 grid gap-3">
          <Campo etiqueta="Nueva contraseña" id="rp-pass" ayuda="Mínimo 8 caracteres.">
            <Entrada
              id="rp-pass"
              type="password"
              value={password}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Confirmar contraseña" id="rp-pass2">
            <Entrada
              id="rp-pass2"
              type="password"
              value={confirmar}
              autoComplete="new-password"
              onChange={(e) => setConfirmar(e.target.value)}
            />
          </Campo>
          <Boton type="submit" disabled={ocupado}>
            {ocupado ? "Guardando…" : "Guardar contraseña"}
          </Boton>
          <a href="/" className="text-sm underline">
            Volver al inicio de sesión
          </a>
        </form>
      </Panel>
    </div>
  );
}
