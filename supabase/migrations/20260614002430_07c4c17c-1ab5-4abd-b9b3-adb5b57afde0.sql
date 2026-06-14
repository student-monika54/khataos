
CREATE TABLE public.voice_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  amount NUMERIC,
  language TEXT,
  transcript TEXT,
  status TEXT NOT NULL DEFAULT 'pending_approval',
  reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.voice_orders TO service_role;

ALTER TABLE public.voice_orders ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: server routes use service role exclusively.

CREATE INDEX voice_orders_customer_id_idx ON public.voice_orders (customer_id, created_at DESC);
CREATE INDEX voice_orders_status_idx ON public.voice_orders (status, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_voice_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_voice_orders_updated_at
BEFORE UPDATE ON public.voice_orders
FOR EACH ROW EXECUTE FUNCTION public.update_voice_orders_updated_at();
