/** Hoja de símbolos SVG. Se monta una sola vez en el layout principal. */
export function SpriteIconos() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <g id="i-ball" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3v18" />
          <path d="M5.7 5.7c3.4 3.1 3.4 9.5 0 12.6M18.3 5.7c-3.4 3.1-3.4 9.5 0 12.6" />
        </g>
        <g id="i-whistle" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 9h-7.5a5 5 0 1 0 0 10h.8l2.7-3H20a3.5 3.5 0 0 0 0-7Z" />
          <path d="M13.5 9V5.5h4.5" />
        </g>
        <g id="i-clock" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="5" width="16" height="14" rx="3" />
          <path d="M9.2 9.5v5M14.8 9.5v5" />
        </g>
        <g id="i-court" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
          <path d="M12 5.5v13" />
          <circle cx="12" cy="12" r="2.4" />
          <path d="M3 9.5v5M21 9.5v5" />
        </g>
        <g id="i-jersey" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 4 5 6l1.4 3.4 1.6-.7V20h8V8.7l1.6.7L19 6l-3.5-2a3.6 3.6 0 0 1-7 0Z" />
        </g>
        <g id="i-hoop" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="4" width="14" height="8.5" rx="1.4" />
          <path d="M8.6 12.5h6.8l-1.1 5.6h-4.6Z" />
          <path d="M12 12.5v5.6" />
        </g>
        <g id="i-bench" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 10.5h15v3.5h-15zM6.5 14v5.5M17.5 14v5.5M4.5 7h15" />
        </g>
        <g id="i-score" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5.5" width="18" height="11.5" rx="2" />
          <path d="M12 5.5V17M6.8 9.5v3.5M17.2 9.5v3.5M9 20h6" />
        </g>
      </defs>
    </svg>
  );
}

export type NombreIcono =
  | "i-ball"
  | "i-whistle"
  | "i-clock"
  | "i-court"
  | "i-jersey"
  | "i-hoop"
  | "i-bench"
  | "i-score";

export function Ico({ nombre, className }: { nombre: NombreIcono; className?: string }) {
  return (
    <svg className={className ?? "ico"} viewBox="0 0 24 24" aria-hidden="true">
      <use href={`#${nombre}`} />
    </svg>
  );
}
