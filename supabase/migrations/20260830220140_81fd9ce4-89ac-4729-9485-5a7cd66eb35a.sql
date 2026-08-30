CREATE OR REPLACE FUNCTION public.bitacora_eliminacion_gasto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_nombre text;
  v_rol text;
  v_actor text;
BEGIN
  SELECT p.nombre INTO v_nombre
  FROM public.profiles p
  WHERE p.id = auth.uid();

  SELECT r.role::text INTO v_rol
  FROM public.user_roles r
  WHERE r.user_id = auth.uid()
  LIMIT 1;

  v_actor := CASE
    WHEN v_nombre IS NULL THEN 'Sistema'
    ELSE v_nombre || ' (' || COALESCE(v_rol, 'Sin rol') || ')'
  END;

  INSERT INTO public.bitacora (id, fecha, actor, actor_id, accion, detalle)
  VALUES (
    gen_random_uuid()::text,
    now(),
    v_actor,
    auth.uid(),
    'Eliminación de gasto',
    format('Gasto eliminado: %s · Proveedor: %s · Rubro: %s · Monto: %s %s · Estatus al borrarse: %s',
      OLD.id,
      COALESCE(OLD.proveedor, ''),
      COALESCE(OLD.rubro, ''),
      OLD.monto,
      COALESCE(OLD.moneda, ''),
      COALESCE(OLD.estatus, '')
    )
  );

  RETURN OLD;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bitacora_eliminacion_gasto() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bitacora_eliminacion_gasto() FROM anon;
REVOKE EXECUTE ON FUNCTION public.bitacora_eliminacion_gasto() FROM authenticated;

DROP TRIGGER IF EXISTS trg_bitacora_eliminacion_gasto ON public.gastos;

CREATE TRIGGER trg_bitacora_eliminacion_gasto
AFTER DELETE ON public.gastos
FOR EACH ROW
EXECUTE FUNCTION public.bitacora_eliminacion_gasto();
