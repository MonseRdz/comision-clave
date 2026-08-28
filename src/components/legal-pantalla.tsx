import { useStore, hoyISO, nuevoId, fechaHora } from "@/lib/store";
import { AVISO_PRIVACIDAD, TERMINOS, VERSION_LEGAL } from "@/lib/legal";
import { descargarComprobanteLegal } from "@/lib/comprobante-legal";
import { Panel, TituloPanel, Boton, Aviso, Etiqueta } from "@/components/glass";

export function DocumentosLegales() {
  return (
    <div className="grid gap-5">
      <Panel as="article">
        <TituloPanel sub="Conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)">
          Aviso de Privacidad
        </TituloPanel>
        <div className="grid gap-4">
          {AVISO_PRIVACIDAD.map((s) => (
            <section key={s.titulo}>
              <h3 className="text-sm font-bold">{s.titulo}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.texto}</p>
            </section>
          ))}
        </div>
      </Panel>
      <Panel as="article">
        <TituloPanel sub="Reglas de buen uso de la plataforma y la información">
          Términos y Condiciones de Uso
        </TituloPanel>
        <div className="grid gap-4">
          {TERMINOS.map((s) => (
            <section key={s.titulo}>
              <h3 className="text-sm font-bold">{s.titulo}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.texto}</p>
            </section>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function LegalPantalla() {
  const { estado, setEstado, registrar, usuarioActual } = useStore();
  const aceptacion = estado.aceptaciones.find(
    (a) => a.usuarioId === usuarioActual.id && a.version === VERSION_LEGAL,
  );

  function aceptar() {
    const registro = {
      id: nuevoId("lg"),
      usuarioId: usuarioActual.id,
      fecha: hoyISO(),
      version: VERSION_LEGAL,
    };
    setEstado((e) => ({ ...e, aceptaciones: [...e.aceptaciones, registro] }));
    registrar(
      "Aceptación de aviso de privacidad y términos",
      `${usuarioActual.nombre} aceptó el Aviso de Privacidad y los Términos y Condiciones ${VERSION_LEGAL} el ${fechaHora(registro.fecha)}.`,
    );
  }

  return (
    <div className="mx-auto max-w-3xl pt-4">
      <div className="mb-4">
        <Panel>
          <TituloPanel sub={`Versión ${VERSION_LEGAL} · Lectura y aceptación obligatoria para todos los roles`}>
            Privacidad y buen uso de la información
          </TituloPanel>
          <p className="text-sm">
            Antes de operar la plataforma debes leer y aceptar el Aviso de Privacidad y los
            Términos y Condiciones. Tu aceptación queda asentada en la bitácora inmutable con
            fecha, hora y versión.
          </p>
        </Panel>
      </div>
      <DocumentosLegales />
      <div className="mt-4">
        <Panel>
          {aceptacion ? (
            <div className="flex flex-wrap items-center gap-3">
              <Etiqueta tono="ok">Documentos aceptados</Etiqueta>
              <Aviso>
                Aceptados el {fechaHora(aceptacion.fecha)} · versión {aceptacion.version}
              </Aviso>
              <Boton
                type="button"
                variante="neutro"
                onClick={() =>
                  descargarComprobanteLegal({
                    usuario: usuarioActual,
                    aceptacionId: aceptacion.id,
                    fechaISO: aceptacion.fecha,
                  })
                }
              >
                Descargar comprobante PDF
              </Boton>
            </div>
          ) : (
            <div className="grid gap-3">
              <Aviso tono="alerta">
                Al aceptar declaras que leíste ambos documentos, que eres responsable de la
                información que cargues y que te comprometes al buen uso de la plataforma.
              </Aviso>
              <div>
                <Boton onClick={aceptar}>Acepto el aviso de privacidad y los términos</Boton>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
