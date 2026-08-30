-- 1) Estatus inicial forzado
CREATE OR REPLACE FUNCTION public.forzar_estatus_inicial_gasto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.es_contralor() THEN
    NEW.estatus := 'Registrado';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_forzar_estatus_inicial_gasto ON public.gastos;
CREATE TRIGGER trg_forzar_estatus_inicial_gasto
BEFORE INSERT ON public.gastos
FOR EACH ROW EXECUTE FUNCTION public.forzar_estatus_inicial_gasto();

-- 2) Precision numerica
ALTER TABLE public.gastos       ALTER COLUMN monto       TYPE numeric(14,2);
ALTER TABLE public.gastos       ALTER COLUMN monto_mxn   TYPE numeric(14,2);
ALTER TABLE public.gastos       ALTER COLUMN tipo_cambio TYPE numeric(12,6);
ALTER TABLE public.presupuestos ALTER COLUMN monto       TYPE numeric(14,2);

-- 3) Bitacora automatica de cambios en gastos
CREATE OR REPLACE FUNCTION public.bitacora_cambios_gasto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_nombre text;
  v_rol text;
  v_actor text;
  v_detalle text := '';
BEGIN
  IF NEW.monto IS DISTINCT FROM OLD.monto THEN
    v_detalle := v_detalle || format('Monto: %s -> %s', OLD.monto, NEW.monto);
  END IF;
  IF NEW.estatus IS DISTINCT FROM OLD.estatus THEN
    IF v_detalle <> '' THEN v_detalle := v_detalle || ' · '; END IF;
    v_detalle := v_detalle || format('Estatus: %s -> %s', OLD.estatus, NEW.estatus);
  END IF;
  IF v_detalle = '' THEN
    RETURN NEW;
  END IF;

  SELECT p.nombre INTO v_nombre FROM public.profiles p WHERE p.id = auth.uid();
  SELECT r.role::text INTO v_rol FROM public.user_roles r WHERE r.user_id = auth.uid() LIMIT 1;
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
    'Cambio en gasto',
    format('Gasto %s · %s', NEW.id, v_detalle)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bitacora_cambios_gasto ON public.gastos;
CREATE TRIGGER trg_bitacora_cambios_gasto
AFTER UPDATE ON public.gastos
FOR EACH ROW EXECUTE FUNCTION public.bitacora_cambios_gasto();

-- 4) Bitacora a prueba de cliente
CREATE OR REPLACE FUNCTION public.forzar_datos_bitacora()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.fecha := now();
  NEW.actor_id := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_forzar_datos_bitacora ON public.bitacora;
CREATE TRIGGER trg_forzar_datos_bitacora
BEFORE INSERT ON public.bitacora
FOR EACH ROW EXECUTE FUNCTION public.forzar_datos_bitacora();

-- 5) Borrado de gastos alineado con edicion
DROP POLICY IF EXISTS "borrado de gastos" ON public.gastos;
CREATE POLICY "borrado de gastos" ON public.gastos
FOR DELETE TO authenticated
USING (
  es_contralor() OR (
    comisionado_id = auth.uid()
    AND estatus <> ALL (ARRAY['Aprobado','Rechazado','Validado por Revisor'])
  )
);

-- 6) search_path completo
ALTER FUNCTION public.es_contralor() SET search_path = public, pg_temp;
ALTER FUNCTION public.esta_aprobado() SET search_path = public, pg_temp;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public, pg_temp;
ALTER FUNCTION public.tiene_delegacion_vigente(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;