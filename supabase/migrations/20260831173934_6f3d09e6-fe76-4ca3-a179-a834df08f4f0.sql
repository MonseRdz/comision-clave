ALTER TABLE public.gastos
  ADD COLUMN IF NOT EXISTS subtotal numeric(14,2) NULL,
  ADD COLUMN IF NOT EXISTS iva numeric(14,2) NULL,
  ADD COLUMN IF NOT EXISTS uuid_fiscal text NULL,
  ADD COLUMN IF NOT EXISTS rfc_emisor text NULL,
  ADD COLUMN IF NOT EXISTS rfc_receptor text NULL;

ALTER TABLE public.configuracion
  ADD COLUMN IF NOT EXISTS rfc_ademeba text NOT NULL DEFAULT '';