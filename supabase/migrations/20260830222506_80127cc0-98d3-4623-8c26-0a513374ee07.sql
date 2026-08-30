CREATE OR REPLACE FUNCTION public.forzar_estatus_inicial_gasto()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.estatus := 'Borrador';
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.forzar_estatus_inicial_gasto() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "lectura gastos por rol" ON public.gastos;
CREATE POLICY "lectura gastos por rol" ON public.gastos
FOR SELECT
USING (
  (comisionado_id = auth.uid())
  OR (
    estatus <> 'Borrador'
    AND (
      es_contralor()
      OR has_role(auth.uid(), 'Revisor'::app_role)
      OR (has_role(auth.uid(), 'Director'::app_role) AND tiene_delegacion_vigente(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "edicion de gastos" ON public.gastos;
CREATE POLICY "edicion de gastos" ON public.gastos
FOR UPDATE
USING (
  es_contralor()
  OR has_role(auth.uid(), 'Revisor'::app_role)
  OR (has_role(auth.uid(), 'Director'::app_role) AND tiene_delegacion_vigente(auth.uid()))
  OR ((comisionado_id = auth.uid()) AND (estatus <> ALL (ARRAY['Aprobado'::text, 'Rechazado'::text, 'Validado por Revisor'::text])))
)
WITH CHECK (
  es_contralor()
  OR has_role(auth.uid(), 'Revisor'::app_role)
  OR (has_role(auth.uid(), 'Director'::app_role) AND tiene_delegacion_vigente(auth.uid()))
  OR ((comisionado_id = auth.uid()) AND (estatus = ANY (ARRAY['Borrador'::text, 'Registrado'::text, 'Devuelto para corrección'::text])))
);

DROP POLICY IF EXISTS "borrado de gastos" ON public.gastos;
CREATE POLICY "borrado de gastos" ON public.gastos
FOR DELETE
TO authenticated
USING (
  es_contralor()
  OR ((comisionado_id = auth.uid()) AND estatus = 'Borrador')
);