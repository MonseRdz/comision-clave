ALTER TABLE public.bitacora DISABLE TRIGGER trg_forzar_datos_bitacora;

INSERT INTO public.bitacora (id, fecha, actor, actor_id, accion, detalle)
VALUES (
  gen_random_uuid()::text,
  now(),
  'Omar Magallanes (Contralor)',
  'd362f267-1548-4836-84cc-f9f7973e8b2f',
  'Inicio de operación productiva',
  'Corte de inicio de operación: ' || to_char(now() AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI') || ' (hora del centro de México). Los registros anteriores correspondían al periodo de pruebas del sistema y fueron depurados tras su respaldo.'
);

ALTER TABLE public.bitacora ENABLE TRIGGER trg_forzar_datos_bitacora;