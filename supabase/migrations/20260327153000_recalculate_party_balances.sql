/*
  # Recalculate customer and supplier balances

  This migration fixes stale balance values by recalculating them from
  sales and payment records. It also creates helper functions so balances
  can be recalculated again later if needed.
*/

CREATE OR REPLACE FUNCTION public.recalculate_company_balances(target_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE customers c
  SET balance = COALESCE((
    SELECT SUM(s.total_amount)
    FROM sales s
    WHERE s.customer_id = c.id
      AND s.company_id = c.company_id
  ), 0) - COALESCE((
    SELECT SUM(p.amount)
    FROM payments p
    WHERE p.customer_id = c.id
      AND p.company_id = c.company_id
      AND p.payment_type = 'income'
  ), 0)
  WHERE c.company_id = target_company_id;

  UPDATE suppliers s
  SET balance = 0 - COALESCE((
    SELECT SUM(p.amount)
    FROM payments p
    WHERE p.supplier_id = s.id
      AND p.company_id = s.company_id
      AND p.payment_type = 'expense'
  ), 0)
  WHERE s.company_id = target_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_current_user_balances()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company_id uuid;
BEGIN
  SELECT uc.company_id
  INTO target_company_id
  FROM user_companies uc
  WHERE uc.user_id = auth.uid()
  ORDER BY uc.created_at ASC
  LIMIT 1;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'No company membership found for current user';
  END IF;

  PERFORM public.recalculate_company_balances(target_company_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_current_user_balances() TO authenticated;

DO $$
DECLARE
  current_company_id uuid;
BEGIN
  FOR current_company_id IN
    SELECT id FROM companies
  LOOP
    PERFORM public.recalculate_company_balances(current_company_id);
  END LOOP;
END;
$$;
