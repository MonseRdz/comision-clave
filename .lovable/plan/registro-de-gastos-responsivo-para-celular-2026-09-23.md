# Registro de gastos responsivo para celular

## Objetivo
Adaptar únicamente la presentación móvil de las pantallas del comisionado en Registro de gastos, manteniendo intactos el diseño de escritorio y toda la lógica de comprobación.

## Cambios
- Mostrar **Documentación pendiente** como tarjetas por debajo de 768 px y conservar su tabla actual desde 768 px.
  - Cada tarjeta incluirá proveedor, rubro, evento, monto en documentación, total del gasto, faltantes, fecha compromiso, vencimiento y la acción **Completar evidencia**.
- Mostrar **Mis gastos** como tarjetas por debajo de 768 px y conservar su tabla actual desde 768 px.
  - Cada tarjeta incluirá fecha, proveedor, rubro, monto original, equivalente MXN, comprobado/pendiente, tipo de comprobante, estatus, documentación/reintegro, observaciones, motivo de devolución y todas las acciones existentes.
  - Los adjuntos y el detalle expandido seguirán disponibles dentro de cada tarjeta.
- Evitar desbordes horizontales:
  - Recortar el desborde horizontal del contenido principal.
  - Permitir que los contenedores de tablas se encojan correctamente.
  - Asegurar que textos, campos y grupos de acciones puedan partirse sin ensanchar la página.
- Mejorar controles en celular:
  - `input`, `select` y `textarea` usarán al menos 16 px.
  - Campos y botones tendrán una altura táctil mínima de 44 px.
  - **Registrar gasto**, **Enviar a revisión** y **Completar evidencia** ocuparán todo el ancho en celular.
- Añadir `accept="image/*,application/pdf"` al cargador principal y a los pases de abordar de ida y regreso.
- Ajustar el encabezado móvil para ocultar solo el correo, mantener nombre y rol, y conservar accesible **Cerrar sesión**.

## Validación
- Comprobar la vista de Registro de gastos a 375 px y escritorio.
- Confirmar que `scrollWidth` no exceda `clientWidth` a 375 px.
- Confirmar que las dos listas móviles contienen todos los datos y acciones de sus tablas.
- Confirmar tamaños táctiles, controles de 16 px, cargadores con cámara/galería y encabezado sin correo en celular.
