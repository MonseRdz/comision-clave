-- ============================================================
-- MEGA-BLOQUE 1 · FUNDACIÓN DE SEGURIDAD
-- Fixes: RLS críticas + Bitácora con actor_id
-- ============================================================

-- FIX 1: Comisionado NO puede cambiar estatus de sus gastos a Aprobado/Rechazado/Validado
DROP POLICY IF EXISTS "edicion de gastos" ON gastos;

CREATE POLICY "edicion de gastos" ON gastos
FOR UPDATE
USING (
  es_contralor()
  OR has_role(auth.uid(), 'Revisor')
  OR (has_role(auth.uid(), 'Director') AND tiene_delegacion_vigente(auth.uid()))
  OR (comisionado_id = auth.uid() AND estatus NOT IN ('Aprobado', 'Rechazado', 'Validado por Revisor'))
)
WITH CHECK (
  es_contralor()
  OR has_role(auth.uid(), 'Revisor')
  OR (has_role(auth.uid(), 'Director') AND tiene_delegacion_vigente(auth.uid()))
  OR (
    comisionado_id = auth.uid()
    AND estatus IN ('Registrado', 'Devuelto para corrección')
  )
);

-- FIX 2: Usuario NO puede auto-aprobar su perfil
DROP POLICY IF EXISTS "actualiza perfil propio" ON profiles;

CREATE POLICY "actualiza perfil propio" ON profiles
FOR UPDATE
USING (id = auth.uid() OR es_contralor())
WITH CHECK (
  es_contralor()
  OR (
    id = auth.uid()
    AND estatus = (SELECT p.estatus FROM public.profiles p WHERE p.id = auth.uid())
  )
);

-- FIX 3: Cada usuario ve solo lo que le corresponde
DROP POLICY IF EXISTS "lectura aprobados" ON gastos;

CREATE POLICY "lectura gastos por rol" ON gastos
FOR SELECT
USING (
  es_contralor()
  OR has_role(auth.uid(), 'Revisor')
  OR (has_role(auth.uid(), 'Director') AND tiene_delegacion_vigente(auth.uid()))
  OR comisionado_id = auth.uid()
);

-- FIX 5: Delegaciones vencidas inmutables
DROP POLICY IF EXISTS "contralor delegaciones" ON delegaciones;
DROP POLICY IF EXISTS "lectura aprobados" ON delegaciones;

CREATE POLICY "contralor crea delegaciones" ON delegaciones
FOR INSERT
WITH CHECK (es_contralor());

CREATE POLICY "contralor modifica delegaciones vigentes" ON delegaciones
FOR UPDATE
USING (es_contralor() AND estatus = 'Vigente')
WITH CHECK (es_contralor() AND estatus IN ('Vigente', 'Cancelada'));

CREATE POLICY "lectura delegaciones autorizadas" ON delegaciones
FOR SELECT
USING (
  es_contralor()
  OR has_role(auth.uid(), 'Revisor')
  OR has_role(auth.uid(), 'Director')
);

-- FIX 4 + 8: Bitácora confiable con actor_id
ALTER TABLE bitacora ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES auth.users(id);

UPDATE bitacora SET actor_id = NULL WHERE actor_id IS NULL;

DROP POLICY IF EXISTS "alta bitacora" ON bitacora;

CREATE POLICY "alta bitacora con actor" ON bitacora
FOR INSERT
WITH CHECK (
  actor_id = auth.uid()
  AND auth.uid() IS NOT NULL
);
