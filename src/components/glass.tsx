import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Ico, type NombreIcono } from "@/components/iconos";

export function Panel({
  children,
  className,
  as: As = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return <As className={cn("glass-panel p-5", className)}>{children}</As>;
}

export function TituloPanel({
  children,
  sub,
  icono,
}: {
  children: ReactNode;
  sub?: string;
  icono?: NombreIcono;
}) {
  return (
    <div className="mb-4">
      <h2 className="titulo-tarjeta flex items-center gap-2 text-base">
        {icono ? <Ico nombre={icono} /> : null}
        {children}
      </h2>
      {sub ? <p className="mt-1 text-sm text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

type Variante = "primario" | "neutro" | "peligro" | "exito";

const variantes: Record<Variante, string> = {
  primario: "bg-primary text-primary-foreground hover:brightness-95",
  neutro: "bg-white text-ink hover:brightness-95",
  peligro: "bg-destructive text-destructive-foreground hover:brightness-110",
  exito: "bg-estado-verde text-white hover:brightness-110",
};

export function Boton({
  variante = "primario",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      {...props}
      className={cn(
        "btn-base disabled:cursor-not-allowed disabled:opacity-60",
        variantes[variante],
        className,
      )}
    />
  );
}

export function Campo({
  etiqueta,
  ayuda,
  children,
  id,
}: {
  etiqueta: string;
  ayuda?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {etiqueta}
      </label>
      {children}
      {ayuda ? <span className="text-xs text-muted-foreground">{ayuda}</span> : null}
    </div>
  );
}

const controlCls =
  "w-full rounded-[10px] border border-hair bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground";

export function Entrada({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(controlCls, className)} />;
}

export function AreaTexto({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(controlCls, "min-h-20", className)} />;
}

export function Selector({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(controlCls, className)} />;
}

export function Etiqueta({
  children,
  tono = "neutro",
}: {
  children: ReactNode;
  tono?: "neutro" | "ok" | "alerta" | "error" | "marca";
}) {
  const tonos = {
    neutro: "bg-accent-soft text-ink-2 border-hair",
    ok: "bg-estado-verde text-white border-transparent",
    alerta: "bg-estado-ambar text-white border-transparent",
    error: "bg-estado-rojo text-white border-transparent",
    marca: "bg-accent text-white border-transparent",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        tonos[tono],
      )}
    >
      {children}
    </span>
  );
}

export function Aviso({ children, tono = "info" }: { children: ReactNode; tono?: "info" | "alerta" | "error" }) {
  const tonos = {
    info: "border-hair bg-accent-soft text-ink",
    alerta: "border-transparent bg-estado-ambar text-white",
    error: "border-transparent bg-estado-rojo text-white",
  } as const;
  return (
    <p role="status" className={cn("rounded-[10px] border px-3 py-2 text-sm font-medium", tonos[tono])}>
      {children}
    </p>
  );
}

export function Tabla({
  cabeceras,
  children,
  vacio,
}: {
  cabeceras: string[];
  children: ReactNode;
  /** Mensaje que sustituye la tabla cuando no hay registros. */
  vacio?: string;
}) {
  const filas = Array.isArray(children) ? children.flat() : children;
  const sinFilas = Array.isArray(filas) ? filas.filter(Boolean).length === 0 : !filas;
  if (vacio && sinFilas) return <p className="text-sm text-muted-foreground">{vacio}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-accent-soft text-ink">
            {cabeceras.map((c) => (
              <th key={c} scope="col" className="border-b border-hair px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Celda({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-hair px-3 py-2 align-top", className)}>{children}</td>;
}
