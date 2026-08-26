import type { Estado } from "./types";

const dias = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};
const fecha = (n: number) => dias(n).slice(0, 10);

export const VERSION_REGLAS = "ADEMEBA v1.0";

export const REGLAS = [
  "Todo gasto con cargo a recursos públicos debe estar respaldado por CFDI vigente (XML y PDF) a nombre de la asociación.",
  "La evidencia nominal (pases de abordar, listas de asistencia, fotografías) debe corresponder a participantes de la lista autorizada del evento.",
  "Los gastos sin comprobante fiscal solo proceden por debajo del tope configurado y requieren justificación escrita.",
  "Los gastos en moneda extranjera se convierten a pesos con el tipo de cambio capturado manualmente por el comisionado, quien es responsable de su veracidad.",
  "La comprobación debe enviarse dentro de los 7 días naturales posteriores al término del evento.",
  "Toda acción realizada en la aplicación queda asentada en una bitácora inmutable disponible para auditoría de CONADE.",
  "El comisionado responde por la autenticidad de la documentación que carga; la falsedad de documentos se sanciona conforme a la normativa vigente.",
];

export function estadoInicial(): Estado {
  return {
    usuarios: [
      { id: "u1", nombre: "Roberto Contralor", rol: "Contralor", activo: true },
      { id: "u2", nombre: "Lucía Revisora", rol: "Revisor", activo: true },
      { id: "u3", nombre: "Juan Entrenador", rol: "Comisionado", activo: true },
      { id: "u4", nombre: "Carlos Director", rol: "Director", activo: true },
      { id: "u5", nombre: "Mónica Administradora", rol: "Administrador", activo: true },
    ],
    eventos: [
      {
        id: "e1",
        nombre: "Nacional Sonora 2024",
        sede: "Hermosillo, Sonora",
        fechaInicio: "2024-10-10",
        fechaFin: "2024-10-16",
        clave: "SON-2024",
        estatus: "Activo",
        participantes: [
          { id: "p1", nombre: "Luis Pérez", tipo: "Jugador" },
          { id: "p2", nombre: "Ana Gómez", tipo: "Jugadora" },
          { id: "p3", nombre: "Pedro Arce", tipo: "Entrenador" },
        ],
      },
      {
        id: "e2",
        nombre: "Mundial Juvenil España",
        sede: "Madrid, España",
        fechaInicio: "2024-12-01",
        fechaFin: "2024-12-10",
        clave: "ESP-MJ24",
        estatus: "Próximo",
        participantes: [{ id: "p4", nombre: "Ana Gómez", tipo: "Jugadora" }],
      },
    ],
    presupuestos: [
      { id: "b1", eventoId: "e1", rubro: "Hospedaje", monto: 20000, responsableId: "u3" },
      { id: "b2", eventoId: "e1", rubro: "Transporte", monto: 8000, responsableId: "u3" },
      { id: "b3", eventoId: "e1", rubro: "Alimentación", monto: 6000, responsableId: "u3" },
      { id: "b4", eventoId: "e2", rubro: "Alimentación", monto: 15000, responsableId: "u3" },
    ],
    gastos: [
      {
        id: "g1",
        eventoId: "e1",
        rubro: "Hospedaje",
        proveedor: "Hotel Sonora",
        monto: 5000,
        moneda: "MXN",
        tipoCambio: 1,
        montoMXN: 5000,
        sinCFDI: false,
        justificacion: "",
        participantesIds: ["p1"],
        archivos: [
          { nombre: "factura-hotel-sonora.xml", tipo: "text/xml", dataUrl: "" },
          { nombre: "factura-hotel-sonora.pdf", tipo: "application/pdf", dataUrl: "" },
        ],
        estatus: "Registrado",
        observaciones: "",
        comisionadoId: "u3",
        creadoEn: dias(-2),
      },
      {
        id: "g2",
        eventoId: "e1",
        rubro: "Transporte",
        proveedor: "Taxis locales",
        monto: 300,
        moneda: "MXN",
        tipoCambio: 1,
        montoMXN: 300,
        sinCFDI: true,
        justificacion: "Taxi local",
        participantesIds: ["p3"],
        archivos: [],
        estatus: "Registrado",
        observaciones: "",
        comisionadoId: "u3",
        creadoEn: dias(-4),
      },
      {
        id: "g3",
        eventoId: "e1",
        rubro: "Alimentación",
        proveedor: "Restaurante Cena Equipo",
        monto: 1200,
        moneda: "MXN",
        tipoCambio: 1,
        montoMXN: 1200,
        sinCFDI: false,
        justificacion: "",
        participantesIds: ["p1", "p2", "p3"],
        archivos: [{ nombre: "cena-equipo.pdf", tipo: "application/pdf", dataUrl: "" }],
        estatus: "Registrado",
        observaciones: "",
        comisionadoId: "u3",
        creadoEn: dias(-10),
      },
      {
        id: "g4",
        eventoId: "e2",
        rubro: "Alimentación",
        proveedor: "Comida Madrid",
        monto: 50,
        moneda: "USD",
        tipoCambio: 17.5,
        montoMXN: 875,
        sinCFDI: false,
        justificacion: "",
        participantesIds: ["p4"],
        archivos: [{ nombre: "comida-madrid.pdf", tipo: "application/pdf", dataUrl: "" }],
        estatus: "Registrado",
        observaciones: "",
        comisionadoId: "u3",
        creadoEn: dias(-1),
      },
    ],
    delegaciones: [
      {
        folio: "DEL-001",
        deId: "u1",
        paraId: "u4",
        fechaInicio: fecha(-2),
        fechaFin: fecha(3),
        motivo: "Comisión de viaje del titular",
        estatus: "Vigente",
      },
    ],
    bitacora: [
      {
        id: "l0",
        fecha: dias(-11),
        actor: "Sistema",
        accion: "Inicialización",
        detalle: "Carga de catálogos maestros y datos base.",
      },
    ],
    aceptaciones: [],
    rubros: ["Hospedaje", "Alimentación", "Transporte", "Inscripciones", "Material deportivo"],
    motivosRechazo: [
      "Comprobante ilegible",
      "Gasto no corresponde al rubro",
      "Participante no autorizado",
      "Excede el presupuesto asignado",
      "Documentación fiscal inválida",
    ],
    justificacionesSinCFDI: [
      "Transporte local",
      "Propinas y servicios menores",
      "Proveedor sin capacidad de facturación",
    ],
    proveedores: ["Hotel Sonora", "Taxis locales", "Restaurante Cena Equipo", "Comida Madrid"],
    topeSinComprobante: 2000,
    versionReglas: VERSION_REGLAS,
    usuarioActualId: "u4",
  };
}
