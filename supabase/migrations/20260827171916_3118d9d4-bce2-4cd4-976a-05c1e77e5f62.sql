-- ============ ROLES Y PERFILES ============
CREATE TYPE public.app_role AS ENUM ('Contralor','Revisor','Director','Comisionado');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  estatus text NOT NULL DEFAULT 'Pendiente',
  creado_en timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ DATOS DE OPERACIÓN ============
CREATE TABLE public.eventos (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  sede text NOT NULL DEFAULT '',
  fecha_inicio date,
  fecha_fin date,
  clave text NOT NULL DEFAULT '',
  estatus text NOT NULL DEFAULT 'Activo'
);
CREATE TABLE public.participantes (
  id text PRIMARY KEY,
  evento_id text NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  tipo text NOT NULL DEFAULT 'Jugador'
);
CREATE TABLE public.presupuestos (
  id text PRIMARY KEY,
  evento_id text NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  rubro text NOT NULL,
  monto numeric NOT NULL DEFAULT 0,
  responsable_id uuid
);
CREATE TABLE public.delegaciones (
  folio text PRIMARY KEY,
  de_id uuid,
  para_id uuid,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  motivo text NOT NULL DEFAULT '',
  estatus text NOT NULL DEFAULT 'Vigente'
);
CREATE TABLE public.gastos (
  id text PRIMARY KEY,
  evento_id text NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  rubro text NOT NULL,
  proveedor text NOT NULL DEFAULT '',
  monto numeric NOT NULL DEFAULT 0,
  moneda text NOT NULL DEFAULT 'MXN',
  tipo_cambio numeric NOT NULL DEFAULT 1,
  monto_mxn numeric NOT NULL DEFAULT 0,
  sin_cfdi boolean NOT NULL DEFAULT false,
  justificacion text NOT NULL DEFAULT '',
  participantes_ids text[] NOT NULL DEFAULT '{}',
  archivos jsonb NOT NULL DEFAULT '[]'::jsonb,
  estatus text NOT NULL DEFAULT 'Registrado',
  observaciones text NOT NULL DEFAULT '',
  comisionado_id uuid,
  creado_en timestamptz NOT NULL DEFAULT now(),
  revisor_id uuid,
  dictaminador_id uuid,
  motivo_rechazo text,
  folio_delegacion text
);
CREATE TABLE public.bitacora (
  id text PRIMARY KEY,
  fecha timestamptz NOT NULL DEFAULT now(),
  actor text NOT NULL DEFAULT '',
  accion text NOT NULL DEFAULT '',
  detalle text NOT NULL DEFAULT ''
);
CREATE TABLE public.aceptaciones (
  id text PRIMARY KEY,
  usuario_id uuid NOT NULL,
  fecha timestamptz NOT NULL DEFAULT now(),
  version text NOT NULL
);
CREATE TABLE public.catalogos (
  id text PRIMARY KEY,
  tipo text NOT NULL,
  valor text NOT NULL
);
CREATE TABLE public.configuracion (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  tope_sin_comprobante numeric NOT NULL DEFAULT 2000,
  version_reglas text NOT NULL DEFAULT 'ADEMEBA v1.0'
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventos, public.participantes,
  public.presupuestos, public.delegaciones, public.gastos, public.bitacora,
  public.aceptaciones, public.catalogos, public.configuracion TO authenticated;
GRANT ALL ON public.eventos, public.participantes, public.presupuestos,
  public.delegaciones, public.gastos, public.bitacora, public.aceptaciones,
  public.catalogos, public.configuracion TO service_role;

-- ============ FUNCIONES DE SEGURIDAD ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.es_contralor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'Contralor');
$$;

CREATE OR REPLACE FUNCTION public.esta_aprobado()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND estatus = 'Aprobado');
$$;

CREATE OR REPLACE FUNCTION public.tiene_delegacion_vigente(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.delegaciones
    WHERE para_id = _uid AND estatus = 'Vigente'
      AND fecha_inicio <= CURRENT_DATE AND fecha_fin >= CURRENT_DATE
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  es_maestro boolean := lower(NEW.email) = 'omar.magallanes@ademeba.com.mx';
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

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ POLÍTICAS ============
CREATE POLICY "perfil propio visible" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.es_contralor() OR public.esta_aprobado());
CREATE POLICY "actualiza perfil propio" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.es_contralor()) WITH CHECK (id = auth.uid() OR public.es_contralor());
CREATE POLICY "contralor elimina perfiles" ON public.profiles FOR DELETE TO authenticated
  USING (public.es_contralor());

CREATE POLICY "roles visibles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.es_contralor() OR public.esta_aprobado());
CREATE POLICY "contralor asigna roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.es_contralor());
CREATE POLICY "contralor cambia roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.es_contralor()) WITH CHECK (public.es_contralor());
CREATE POLICY "contralor quita roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.es_contralor());

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delegaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitacora ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aceptaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lectura aprobados" ON public.eventos FOR SELECT TO authenticated USING (public.esta_aprobado());
CREATE POLICY "lectura aprobados" ON public.participantes FOR SELECT TO authenticated USING (public.esta_aprobado());
CREATE POLICY "lectura aprobados" ON public.presupuestos FOR SELECT TO authenticated USING (public.esta_aprobado());
CREATE POLICY "lectura aprobados" ON public.delegaciones FOR SELECT TO authenticated USING (public.esta_aprobado());
CREATE POLICY "lectura aprobados" ON public.gastos FOR SELECT TO authenticated USING (public.esta_aprobado());
CREATE POLICY "lectura aprobados" ON public.bitacora FOR SELECT TO authenticated USING (public.esta_aprobado());
CREATE POLICY "lectura aprobados" ON public.catalogos FOR SELECT TO authenticated USING (public.esta_aprobado());
CREATE POLICY "lectura aprobados" ON public.configuracion FOR SELECT TO authenticated USING (public.esta_aprobado());
CREATE POLICY "lectura aceptaciones" ON public.aceptaciones FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.es_contralor() OR public.esta_aprobado());

CREATE POLICY "contralor eventos" ON public.eventos FOR ALL TO authenticated
  USING (public.es_contralor()) WITH CHECK (public.es_contralor());
CREATE POLICY "contralor participantes" ON public.participantes FOR ALL TO authenticated
  USING (public.es_contralor()) WITH CHECK (public.es_contralor());
CREATE POLICY "contralor catalogos" ON public.catalogos FOR ALL TO authenticated
  USING (public.es_contralor()) WITH CHECK (public.es_contralor());
CREATE POLICY "contralor configuracion" ON public.configuracion FOR ALL TO authenticated
  USING (public.es_contralor()) WITH CHECK (public.es_contralor());
CREATE POLICY "contralor delegaciones" ON public.delegaciones FOR ALL TO authenticated
  USING (public.es_contralor()) WITH CHECK (public.es_contralor());

CREATE POLICY "presupuestos escritura" ON public.presupuestos FOR ALL TO authenticated
  USING (public.es_contralor() OR (public.has_role(auth.uid(),'Director') AND public.tiene_delegacion_vigente(auth.uid())))
  WITH CHECK (public.es_contralor() OR (public.has_role(auth.uid(),'Director') AND public.tiene_delegacion_vigente(auth.uid())));

CREATE POLICY "alta de gastos" ON public.gastos FOR INSERT TO authenticated
  WITH CHECK (public.esta_aprobado() AND (public.es_contralor() OR (public.has_role(auth.uid(),'Comisionado') AND comisionado_id = auth.uid())));
CREATE POLICY "edicion de gastos" ON public.gastos FOR UPDATE TO authenticated
  USING (
    public.es_contralor()
    OR public.has_role(auth.uid(),'Revisor')
    OR (public.has_role(auth.uid(),'Director') AND public.tiene_delegacion_vigente(auth.uid()))
    OR (comisionado_id = auth.uid() AND estatus NOT IN ('Aprobado','Rechazado'))
  )
  WITH CHECK (
    public.es_contralor()
    OR public.has_role(auth.uid(),'Revisor')
    OR (public.has_role(auth.uid(),'Director') AND public.tiene_delegacion_vigente(auth.uid()))
    OR comisionado_id = auth.uid()
  );
CREATE POLICY "borrado de gastos" ON public.gastos FOR DELETE TO authenticated
  USING (public.es_contralor() OR (comisionado_id = auth.uid() AND estatus NOT IN ('Aprobado','Rechazado')));

CREATE POLICY "alta bitacora" ON public.bitacora FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "alta aceptacion" ON public.aceptaciones FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());

-- ============ DATOS INICIALES ============
INSERT INTO public.configuracion (id, tope_sin_comprobante, version_reglas) VALUES (1, 2000, 'ADEMEBA v1.0');

INSERT INTO public.catalogos (id, tipo, valor) VALUES
  ('c1','rubro','Hospedaje'),('c2','rubro','Alimentación'),('c3','rubro','Transporte'),
  ('c4','rubro','Inscripciones'),('c5','rubro','Material deportivo'),
  ('c6','motivo','Comprobante ilegible'),('c7','motivo','Gasto no corresponde al rubro'),
  ('c8','motivo','Participante no autorizado'),('c9','motivo','Excede el presupuesto asignado'),
  ('c10','motivo','Documentación fiscal inválida'),
  ('c11','justificacion','Transporte local'),('c12','justificacion','Propinas y servicios menores'),
  ('c13','justificacion','Proveedor sin capacidad de facturación'),
  ('c14','proveedor','Hotel Sonora'),('c15','proveedor','Taxis locales'),
  ('c16','proveedor','Restaurante Cena Equipo'),('c17','proveedor','Comida Madrid');

INSERT INTO public.eventos (id, nombre, sede, fecha_inicio, fecha_fin, clave, estatus) VALUES
  ('e1','Nacional de Básquetbol Sonora 2024','Hermosillo, Sonora','2024-10-10','2024-10-16','SON-2024','Activo'),
  ('e2','Mundial Juvenil España','Madrid, España','2024-12-01','2024-12-10','ESP-MJ24','Próximo');

INSERT INTO public.participantes (id, evento_id, nombre, tipo) VALUES
  ('p1','e1','Luis Pérez','Jugador'),
  ('p2','e1','Ana Gómez','Jugadora'),
  ('p3','e1','Pedro Arce','Entrenador'),
  ('p4','e2','Ana Gómez','Jugadora');