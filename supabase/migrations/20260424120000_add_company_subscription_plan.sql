ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS subscription_plan text;

UPDATE public.companies
SET subscription_plan = COALESCE(subscription_plan, 'pro');

ALTER TABLE public.companies
ALTER COLUMN subscription_plan SET DEFAULT 'free';

ALTER TABLE public.companies
ALTER COLUMN subscription_plan SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'companies_subscription_plan_check'
  ) THEN
    ALTER TABLE public.companies
    ADD CONSTRAINT companies_subscription_plan_check
    CHECK (subscription_plan IN ('free', 'pro'));
  END IF;
END $$;
