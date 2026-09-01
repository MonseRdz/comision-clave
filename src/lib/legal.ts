// Documentos legales de la plataforma. Cambiar el texto implica subir la
// versión para forzar una nueva aceptación de todos los usuarios.

export const VERSION_LEGAL = "LEGAL v1.1";

export const AVISO_PRIVACIDAD: { titulo: string; texto: string }[] = [
  {
    titulo: "1. Responsable del tratamiento de datos",
    texto:
      "ADEMEBA (ASOCIACION DEPORTIVA MEXICANA DE BASQUETBOL A.C.), a través de su Contralor, es responsable del tratamiento de los datos personales recabados en esta plataforma. Para ejercer derechos ARCO (Acceso, Rectificación, Cancelación y Oposición) o revocar consentimientos, el usuario debe dirigir su solicitud al Contralor de ADEMEBA por los canales internos de la asociación.",
  },
  {
    titulo: "2. Datos personales que se recaban",
    texto:
      "Nombre completo, correo electrónico institucional y rol asignado; datos contenidos en los comprobantes de gasto que el propio usuario carga (facturas CFDI, tickets, pases de abordar), incluyendo nombres de participantes en listas nominales de eventos; así como las huellas digitales (hash SHA-256) de los documentos para el control antiduplicados.",
  },
  {
    titulo: "3. Finalidades del tratamiento",
    texto:
      "Los datos se utilizan exclusivamente para: (a) la comprobación y justificación de recursos públicos ante CONADE y demás órganos fiscalizadores; (b) el control presupuestal interno de ADEMEBA; (c) la trazabilidad de aprobaciones, dictámenes y delegaciones de autoridad; y (d) la generación del expediente de evidencia nominal. No se utilizan con fines comerciales, publicitarios ni de perfilamiento.",
  },
  {
    titulo: "4. Procesamiento por servicios de IA",
    texto:
      "Cuando el usuario utiliza la extracción inteligente, los documentos son enviados a un servicio externo de inteligencia artificial únicamente para transcribir sus datos. Este procesamiento requiere el consentimiento expreso del usuario (versión IA-LFPDPPP), que se registra con fecha y hora. El usuario siempre puede optar por la captura manual sin aceptar este procesamiento.",
  },
  {
    titulo: "5. Responsabilidad sobre la información cargada",
    texto:
      "Cada usuario es responsable de la veracidad, autenticidad y licitud de los documentos e información que carga a la plataforma. ADEMEBA no valida la autenticidad de los comprobantes ante el SAT ni ante terceros; la comprobación es una declaración del usuario que la registra.",
  },
  {
    titulo: "6. Conservación y seguridad",
    texto:
      "La información se resguarda con medidas de seguridad administrativas y técnicas: control de acceso por usuario y contraseña, roles con privilegios mínimos, bitácora inmutable de operaciones y cifrado en tránsito. Los datos se conservan durante los plazos exigidos por la normatividad de fiscalización de recursos públicos aplicable a ADEMEBA.",
  },
  {
    titulo: "7. Transferencias de datos",
    texto:
      "No se realizan transferencias de datos personales a terceros, salvo las requeridas por CONADE u órganos fiscalizadores en ejercicio de sus atribuciones, o las exigidas por autoridad competente conforme a la ley.",
  },
];

export const TERMINOS: { titulo: string; texto: string }[] = [
  {
    titulo: "1. Objeto de la plataforma",
    texto:
      "Tresora Comprobación es la herramienta interna de ADEMEBA para centralizar la comprobación de gastos de eventos deportivos, la evidencia nominal y el dictamen de comprobaciones. Su uso está restringido al personal autorizado por el Contralor.",
  },
  {
    titulo: "2. Acceso y roles",
    texto:
      "El acceso requiere solicitud previa y aprobación del Contralor, quien asigna el rol correspondiente (Contralor, Revisor, Director o Comisionado). Cada usuario es responsable de la confidencialidad de su contraseña y de toda operación realizada con su cuenta. Está prohibido compartir credenciales.",
  },
  {
    titulo: "3. Buen uso de la información",
    texto:
      "El usuario se obliga a: (a) cargar únicamente documentos auténticos y relacionados con gastos comprobables; (b) no registrar el mismo documento más de una vez; (c) capturar los datos de forma veraz, aun cuando la IA proponga valores; (d) no intentar acceder a información o funciones ajenas a su rol; y (e) no alterar, borrar ni manipular registros una vez aprobados, que son inmutables.",
  },
  {
    titulo: "4. Confirmación humana obligatoria",
    texto:
      "Los datos propuestos por la extracción inteligente no se guardan sin la confirmación expresa del usuario. La IA solo propone; la persona valida y responde por el dato confirmado.",
  },
  {
    titulo: "5. Bitácora y trazabilidad",
    texto:
      "Todas las operaciones relevantes (altas, cambios de estatus, aceptaciones, delegaciones, dictámenes y aprobaciones) se asientan en una bitácora inmutable con fecha, hora y actor. El uso de la plataforma implica la aceptación de este registro.",
  },
  {
    titulo: "6. Consecuencias del mal uso",
    texto:
      "El incumplimiento de estos términos puede derivar en la suspensión o baja del acceso, sin perjuicio de las responsabilidades administrativas o legales a que haya lugar, especialmente tratándose de comprobación de recursos públicos.",
  },
  {
    titulo: "7. Modificaciones",
    texto:
      "ADEMEBA puede actualizar este aviso de privacidad y estos términos. Toda nueva versión requerirá una nueva aceptación del usuario antes de seguir operando la plataforma, y quedará asentada en la bitácora.",
  },
];
