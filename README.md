# ADEMEBA Nacional Sistema de Comprobación de Gastos

Construye una aplicación web en español llamada "Comprobación de Gastos", siguiendo este documento al pie de la letra. No agregues funciones que no estén aquí.

**CÓMO VAS A TRABAJAR (léelo primero)**

1. Construye las funciones en el orden en que están listadas, UNA a la vez.
2. Al terminar cada función, pruébala tú mismo como lo haría el usuario: abre la vista previa, captura datos de ejemplo realistas, da los clics y revisa que no haya errores.
3. Compara el resultado con su prueba ("sabrás que quedó cuando…"). Si no la cumple, corrígela y vuelve a probarla. No pases a la siguiente función con algo a medias.
4. Solo cuando cumpla su prueba, avanza a la siguiente función.
5. Al terminar todas, recorre el viaje completo de principio a fin con los datos de prueba del final de este documento, y corrige lo que no cuadre.
6. Si algo se rompe y no logras arreglarlo en dos intentos, DETENTE. No inventes funciones que no están aquí, no cambies de enfoque, no agregues librerías nuevas y no reescribas lo que ya funcionaba. Dime en qué función te detuviste, qué esperabas que pasara, qué pasó en su lugar y qué error apareció, si hubo alguno. Se retoma desde ahí: no se improvisa hacia adelante.

PARA QUIÉN ES Y QUÉ PROBLEMA RESUELVE:
Esta aplicación es para el equipo administrativo de una asociación deportiva nacional (Contralor, Revisor, Administrador, Director y Comisionados) para resolver el caos documental y el riesgo legal ante auditorías de CONADE. Actualmente, las comprobaciones se envían desordenadas por medios informales, lo que impide saber en tiempo real cuánto se ha gastado, qué falta por comprobar y si la evidencia coincide con los participantes autorizados. La app centraliza la justificación de recursos públicos, asegurando que cada gasto tenga respaldo fiscal y evidencia nominal en tiempo y forma.

ORDEN DE CONSTRUCCIÓN (una función a la vez, cada una con su prueba):

1. **Gestión de Usuarios y Configuración (Administrador):** Capacidad para dar de alta usuarios con roles (Contralor, Revisor, Administrador, Director, Comisionado) y configurar el tope para gastos sin comprobante (default $2,000 MXN).
**Sabrás que quedó cuando:** Cree un usuario llamado "Juan Entrenador" con rol Comisionado y defina que el tope sin factura sea de $1,500 MXN.

2. **Gestión de Eventos y Participantes (agregada para que el resto funcione):** Registro de eventos (nombre, sede, fechas, clave presupuestal) y carga de la lista nominal de deportistas y personal autorizados para cada uno.
**Sabrás que quedó cuando:** Registre el evento "Nacional de Básquetbol Sonora 2024" y le asigne a los deportistas "Luis Pérez" y "Ana Gómez" como participantes autorizados.

3. **Asignación de Presupuestos:** Definir montos específicos por evento, rubro de gasto (hospedaje, alimentación, etc.) y asignar un comisionado responsable.
**Sabrás que quedó cuando:** Asigne $20,000 MXN al rubro "Hospedaje" para el evento de Sonora bajo la responsabilidad de "Juan Entrenador".

4. **Aceptación de Reglas Institucionales:** Pantalla de bienvenida obligatoria con las reglas de ADEMEBA que el Comisionado debe aceptar formalmente antes de usar la app, registrando fecha, hora y versión en una bitácora inmutable.
**Sabrás que quedó cuando:** Al entrar como "Juan Entrenador", no pueda ver nada más que las reglas y, al dar clic en "Aceptar", se guarde el registro y me permita pasar al registro de gastos.

5. **Registro de Gastos con CFDI y Evidencia:** Formulario para subir facturas (XML/PDF) y evidencia (pases de abordar), vinculándolos a un rubro y seleccionando qué participantes de la lista autorizada usaron el servicio.
**Sabrás que quedó cuando:** Suba una factura de $5,000 MXN de "Hotel Sonora" vinculada a "Luis Pérez" y el sistema me permita ver ambos archivos adjuntos.

6. **Registro de Gastos Sin CFDI y Moneda Extranjera:** Captura de gastos sin factura (con tope y justificación obligatoria) y gastos en moneda extranjera con ingreso manual de tipo de cambio para conversión a pesos.
**Sabrás que quedó cuando:** Registre un gasto de "Taxis" por $300 MXN marcándolo como "Sin CFDI" usando la justificación "Transporte local", y otro de $50 USD a tipo de cambio 17.00, resultando en $850 MXN automáticos.

7. **Dictamen Técnico (Revisor):** Consola para que el Revisor valide técnicamente la información y la envíe al Contralor o la devuelva al Comisionado con observaciones.
**Sabrás que quedó cuando:** Como Revisor, vea el gasto de "Hotel Sonora", escriba "Falta pase de abordar" y lo devuelva a "Juan Entrenador", cambiando su estatus a "Devuelto para corrección".

8. **Delegación de Autoridad:** Función para que el Contralor delegue sus facultades al Director General con fechas de inicio y fin, generando un folio de referencia.
**Sabrás que quedó cuando:** El Contralor delegue al "Director Carlos" del 1 al 5 de noviembre; durante esas fechas el Director debe poder ver botones de aprobación que antes no tenía.

9. **Aprobación Definitiva (Contralor/Delegado):** Consola para aprobar definitivamente o rechazar gastos (usando catálogo de motivos). Una vez aprobado, el gasto es inmutable.
**Sabrás que quedó cuando:** Apruebe el gasto de "Taxis" y, al intentar editar el monto como administrador o comisionado, el sistema me lo impida por estar ya dictaminado.

10. **Tablero de Gestión Directiva (Anexo):** Pantalla visual con indicadores financieros y de cumplimiento.
**Sabrás que quedó cuando:** Vea sin dar clics el total asignado ($20,000) vs comprobado ($5,850), el semáforo del evento Sonora en amarillo por tener comprobaciones pendientes, y un aviso de "Delegación Activa" hacia el Director.

11. **Reporte de Avance y Expediente Nominal (Anexo):** Generación de listas detalladas de avance por evento y el expediente de auditoría que vincula gastos con personas y dictaminadores.
**Sabrás que quedó cuando:** Genere el "Expediente de Evidencia Nominal" y aparezca que el gasto de "Hotel Sonora" fue usado por "Luis Pérez" y aprobado por el folio de delegación "DEL-001".

LAS PANTALLAS:
1. Tablero de Control (Director): Vista de alto nivel con presupuesto, semáforo de riesgo y retrasos.
2. Pantalla de Bienvenida y Aceptación de Reglas (Comisionado): Lectura y aceptación obligatoria de normativas.
3. Módulo de Registro de Gastos (Comprobador): Carga de archivos, selección de participantes y montos.
4. Consola de Validación Técnica (Revisor): Revisión de primer nivel y comentarios.
5. Consola de Aprobación Definitiva (Contralor): Aprobación final, rechazo y gestión de delegaciones.
6. Gestión de Eventos y Participantes: Configuración de torneos y listas nominales.
7. Gestión de Usuarios y Configuración (Administrador): Roles, catálogos (rubros, motivos) y topes.

QUÉ INFORMACIÓN MANEJA:
* Eventos: Nombres, sedes, fechas y claves presupuestales.
* Presupuestos: Montos asignados por rubro y responsable.
* Personas: Catálogo de deportistas, entrenadores y administrativos.
* Comprobantes: Facturas (XML/PDF), fotos de tickets y archivos de evidencia complementaria.
* Catálogos Maestros: Proveedores, monedas, rubros de gasto, motivos de rechazo y justificaciones sin CFDI.
* Delegaciones de Autoridad: Fecha inicio/fin, motivo, estatus y folio único.
* Bitácora: Registro histórico inmutable de toda acción.
* Nada más.
* Contenido del Tablero: Indicadores de presupuesto (Total, Comprobado, Disponible, %), Antigüedad de pendientes (<3, 3-7, +7 días), Monto en riesgo, Semáforo de auditoría, Delegaciones vigentes.
* Contenido del Reporte de Avance: Nombre del evento, % comprobado, comisionados pendientes, días de atraso.
* Contenido del Expediente Nominal: Comprobantes por rubro, asociación con participantes, estatus final y usuario dictaminador.

QUÉ NO HACE (POR AHORA) — PROHIBIDO EN ESTA VERSIÓN:
* No valida automáticamente los CFDI ante el portal del SAT.
* No consulta automáticamente el tipo de cambio en la página de Banxico.
* No funciona en modo offline.
* No genera automáticamente los formatos oficiales finales de CONADE.
* No realiza pagos ni transferencias bancarias desde la app.

**ESTILO VISUAL**

Estilo Vidrio (glasmorfismo): paneles semitransparentes sobre un fondo de color, como vidrio esmerilado.
El texto nunca va directo sobre la imagen o el degradado del fondo: va sobre un panel lo bastante opaco para que el contraste con el texto se mantenga aunque el fondo cambie.

El color principal de la app es Naranja (#FF8A00). Cuando ese color va de relleno detrás de texto — botones, encabezados, etiquetas —, el texto encima va en #08081C. No uses blanco: sobre este color da 2,4:1 y el mínimo exigido es 4,5:1.

Sobre el fondo claro de la app, este color da 2,4:1 y el mínimo exigido para distinguir un control es 3:1. Por eso cada botón o campo relleno con este color lleva además un borde visible: el relleno solo no lo separa del fondo.

Usabilidad: aplicar las 10 heurísticas de usabilidad de Jakob Nielsen cuando aplique. Accesibilidad: diseñar y desarrollar siguiendo WCAG 2.2, con objetivo mínimo de nivel AA. En palabras simples: que cualquier persona pueda usar la app, incluidas las que ven poco, no distinguen bien los colores o navegan solo con el teclado. Todo control (botón, campo, casilla, pestaña) tiene un borde o un relleno visible que lo separa del fondo, y un indicador de foco propio para quien navega con el teclado.

Si el estilo visual y la accesibilidad se contradicen, gana la accesibilidad: ajusta el estilo hasta que el contraste y el foco cumplan, nunca al revés.

DATOS DE EJEMPLO PARA TUS PRUEBAS:
* **Usuarios:** Roberto Contralor, Lucía Revisora, Juan Entrenador (Comisionado), Carlos Director.
* **Eventos:** 
  - "Nacional Sonora 2024" (Activo), Clave: SON-2024.
  - "Mundial Juvenil España" (Próximo), Clave: ESP-MJ24.
* **Participantes:** Luis Pérez (Jugador), Ana Gómez (Jugadora), Pedro Arce (Entrenador).
* **Gastos de prueba:**
  - Factura Hotel Sonora: $5,000 MXN, Rubro Hospedaje, Participante: Luis Pérez.
  - Gasto Sin CFDI: $300 MXN, Rubro Transporte, Justificación: Taxi local.
  - Gasto Atrasado: Cena equipo, $1,200 MXN, registrado hace 10 días sin validar (para probar alerta de +7 días).
  - Gasto Extranjero: Comida Madrid, $50 USD, Tipo cambio 17.50.
* **Delegación:** Folio DEL-001, del Contralor al Director Carlos por "Comisión de viaje del titular".

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ec6dafb1-4d3b-4790-9e51-ae125408353a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
