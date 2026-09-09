ALTER TABLE public.gastos ADD COLUMN IF NOT EXISTS documentacion jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP POLICY IF EXISTS "edicion de gastos" ON public.gastos;
CREATE POLICY "edicion de gastos" ON public.gastos
FOR UPDATE
USING (
  es_contralor()
  OR has_role(auth.uid(), 'Revisor'::app_role)
  OR (has_role(auth.uid(), 'Director'::app_role) AND tiene_delegacion_vigente(auth.uid()))
  OR ((comisionado_id = auth.uid()) AND (estatus <> ALL (ARRAY['Aprobado'::text, 'Rechazado'::text, 'Validado por Revisor'::text])))
  OR (
    estatus = 'Aprobado'::text
    AND (documentacion->>'estatus') = 'Abierto'
    AND (comisionado_id = auth.uid() OR (documentacion->>'responsableId') = auth.uid()::text)
  )
)
WITH CHECK (
  es_contralor()
  OR has_role(auth.uid(), 'Revisor'::app_role)
  OR (has_role(auth.uid(), 'Director'::app_role) AND tiene_delegacion_vigente(auth.uid()))
  OR ((comisionado_id = auth.uid()) AND (estatus = ANY (ARRAY['Borrador'::text, 'Registrado'::text, 'Devuelto para corrección'::text])))
  OR (
    estatus = 'Aprobado'::text
    AND (documentacion->>'estatus') = 'Abierto'
    AND (comisionado_id = auth.uid() OR (documentacion->>'responsableId') = auth.uid()::text)
  )
);

CREATE OR REPLACE FUNCTION public.proteger_gasto_aprobado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF OLD.estatus = 'Aprobado' AND NOT public.es_contralor() THEN
    IF NEW.estatus IS DISTINCT FROM OLD.estatus
       OR NEW.monto IS DISTINCT FROM OLD.monto
       OR NEW.monto_mxn IS DISTINCT FROM OLD.monto_mxn
       OR NEW.moneda IS DISTINCT FROM OLD.moneda
       OR NEW.tipo_cambio IS DISTINCT FROM OLD.tipo_cambio
       OR NEW.rubro IS DISTINCT FROM OLD.rubro
       OR NEW.proveedor IS DISTINCT FROM OLD.proveedor
       OR NEW.evento_id IS DISTINCT FROM OLD.evento_id
       OR NEW.tipo_comprobante IS DISTINCT FROM OLD.tipo_comprobante
       OR NEW.viajeros IS DISTINCT FROM OLD.viajeros
       OR NEW.pago IS DISTINCT FROM OLD.pago
       OR NEW.pago_pendiente IS DISTINCT FROM OLD.pago_pendiente
       OR NEW.documentacion IS DISTINCT FROM OLD.documentacion
    THEN
      RAISE EXCEPTION 'El gasto ya fue aprobado: solo se admite agregar la evidencia faltante.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_proteger_gasto_aprobado ON public.gastos;
CREATE TRIGGER trg_proteger_gasto_aprobado
BEFORE UPDATE ON public.gastos
FOR EACH ROW EXECUTE FUNCTION public.proteger_gasto_aprobado();