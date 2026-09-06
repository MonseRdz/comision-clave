CREATE POLICY "comprobantes lectura autorizada"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'comprobantes' AND public.esta_aprobado());

CREATE POLICY "comprobantes alta autorizada"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'comprobantes' AND public.esta_aprobado() AND owner = auth.uid());

CREATE POLICY "comprobantes borrado propio o contralor"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'comprobantes' AND (owner = auth.uid() OR public.es_contralor()));