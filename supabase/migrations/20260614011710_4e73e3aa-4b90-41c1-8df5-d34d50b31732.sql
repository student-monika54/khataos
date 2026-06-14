
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS trust_score numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS credit_recommendation text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS decision_reason text;

UPDATE public.orders SET status = 'pending_credit_review' WHERE status = 'pending_approval';
UPDATE public.orders SET status = 'ready_for_pickup' WHERE status = 'ready';

ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'pending_credit_review';
