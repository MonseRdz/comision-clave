import { jsPDF } from "jspdf";
import { VERSION_LEGAL } from "./legal";
import type { Usuario } from "./types";

const NARANJA: [number, number, number] = [255, 138, 0];
const TINTA: [number, number, number] = [8, 8, 28];

export function descargarComprobanteLegal(params: {
  usuario: Usuario;
  aceptacionId: string;
  fechaISO: string;
}) {
  const { usuario, aceptacionId, fechaISO } = params;
  const fecha = new Date(fechaISO);
  const fechaTxt = fecha.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const horaTxt = fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const W = doc.internal.pageSize.getWidth();

  // Encabezado
  doc.setFillColor(...NARANJA);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(...TINTA);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Comprobante de Aceptación", W / 2, 13, { align: "center" });
  doc.setFontSize(10);
  doc.text("Aviso de Privacidad y Términos y Condiciones · ADEMEBA", W / 2, 21, { align: "center" });

  // Cuerpo
  doc.setFontSize(11);
  doc.setTextColor(...TINTA);
  let y = 45;
  const linea = (etiqueta: string, valor: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(etiqueta, 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(valor, 70, y);
    y += 9;
  };

  linea("Nombre:", usuario.nombre);
  linea("Correo:", usuario.email);
  linea("Rol:", usuario.rol);
  linea("Documento:", `Aviso de Privacidad y Términos y Condiciones ${VERSION_LEGAL}`);
  linea("Versión:", VERSION_LEGAL);
  linea("Fecha de aceptación:", fechaTxt);
  linea("Hora de aceptación:", `${horaTxt} (hora local del dispositivo)`);
  linea("Folio de registro:", aceptacionId);

  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const declaracion = doc.splitTextToSize(
    "Por medio de este comprobante se acredita que la persona identificada leyó y aceptó el Aviso de " +
      "Privacidad (conforme a la LFPDPPP) y los Términos y Condiciones de Uso de la plataforma de " +
      "Comprobación de Gastos de ADEMEBA. La aceptación quedó asentada en la bitácora inmutable del " +
      "sistema con la fecha, hora y versión indicadas.",
    W - 40,
  );
  doc.text(declaracion, 20, y);
  y += declaracion.length * 5 + 10;

  // Línea de firma
  doc.setDrawColor(...TINTA);
  doc.line(55, y + 12, W - 55, y + 12);
  doc.setFontSize(9);
  doc.text(usuario.nombre, W / 2, y + 18, { align: "center" });
  doc.text("Aceptación electrónica registrada en plataforma", W / 2, y + 23, { align: "center" });

  // Pie
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Generado el ${new Date().toLocaleString("es-MX")} · Plataforma de Comprobación de Gastos ADEMEBA`,
    W / 2,
    272,
    { align: "center" },
  );

  doc.save(`comprobante-aceptacion-${VERSION_LEGAL.replace(/\s+/g, "-")}.pdf`);
}
