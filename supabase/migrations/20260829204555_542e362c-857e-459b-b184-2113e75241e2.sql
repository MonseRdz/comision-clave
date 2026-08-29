CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  es_maestro boolean := lower(NEW.email) = 'contralor.demo@test.com';
BEGIN
  INSERT INTO public.profiles (id, nombre, email, estatus)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE WHEN es_maestro THEN 'Aprobado' ELSE 'Pendiente' END
  )
  ON CONFLICT (id) DO NOTHING;

  IF es_maestro THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'Contralor')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;