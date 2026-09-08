ALTER TABLE public.gastos
  ADD COLUMN IF NOT EXISTS pago jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pago_pendiente boolean NOT NULL DEFAULT false;