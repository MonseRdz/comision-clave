ALTER TABLE public.gastos
  ADD COLUMN IF NOT EXISTS tipo_comprobante text NOT NULL DEFAULT 'CFDI nacional',
  ADD COLUMN IF NOT EXISTS pais_emision text NOT NULL DEFAULT '';

UPDATE public.gastos
SET tipo_comprobante = CASE WHEN sin_cfdi THEN 'Sin comprobante fiscal' ELSE 'CFDI nacional' END;

ALTER TABLE public.gastos
  ADD CONSTRAINT gastos_tipo_comprobante_valido
  CHECK (tipo_comprobante IN ('CFDI nacional','Comprobante extranjero','Sin comprobante fiscal'));

CREATE OR REPLACE FUNCTION public.sincronizar_sin_cfdi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  NEW.sin_cfdi := (NEW.tipo_comprobante = 'Sin comprobante fiscal');
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sincronizar_sin_cfdi() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_sincronizar_sin_cfdi ON public.gastos;
CREATE TRIGGER trg_sincronizar_sin_cfdi
BEFORE INSERT OR UPDATE OF tipo_comprobante ON public.gastos
FOR EACH ROW EXECUTE FUNCTION public.sincronizar_sin_cfdi();