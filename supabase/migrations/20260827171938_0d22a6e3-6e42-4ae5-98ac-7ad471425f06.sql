REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.es_contralor() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.esta_aprobado() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tiene_delegacion_vigente(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.es_contralor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.esta_aprobado() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tiene_delegacion_vigente(uuid) TO authenticated;