
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL,
  customer_name text NOT NULL,
  phone text,
  retailer_id text,
  source text NOT NULL DEFAULT 'voice_call',
  call_id text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  amount numeric,
  language text,
  transcript text,
  status text NOT NULL DEFAULT 'pending_approval',
  reasoning text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE INDEX orders_customer_id_created_at_idx ON public.orders (customer_id, created_at DESC);
CREATE INDEX orders_status_created_at_idx ON public.orders (status, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER orders_set_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_orders_updated_at();
