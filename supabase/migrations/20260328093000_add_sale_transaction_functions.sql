/*
  # Add transaction-safe sale functions

  Moves sale creation and deletion into SQL functions so stock mutations,
  line items, and movement records stay consistent.
*/

CREATE OR REPLACE FUNCTION public.create_sale_with_items(
  target_customer_id uuid,
  sale_items_payload jsonb,
  target_sale_number text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company_id uuid;
  new_sale_id uuid;
  current_item jsonb;
  current_product_id uuid;
  current_quantity numeric;
  current_unit_price numeric;
  current_sale_number text;
  product_row products%ROWTYPE;
BEGIN
  SELECT uc.company_id
  INTO target_company_id
  FROM public.user_companies uc
  WHERE uc.user_id = auth.uid()
  ORDER BY uc.created_at ASC
  LIMIT 1;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'No company membership found for current user';
  END IF;

  IF target_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = target_customer_id
      AND c.company_id = target_company_id
  ) THEN
    RAISE EXCEPTION 'Customer does not belong to current company';
  END IF;

  IF sale_items_payload IS NULL
    OR jsonb_typeof(sale_items_payload) <> 'array'
    OR jsonb_array_length(sale_items_payload) = 0 THEN
    RAISE EXCEPTION 'At least one sale item is required';
  END IF;

  current_sale_number := COALESCE(NULLIF(trim(target_sale_number), ''), 'SAT-' || extract(epoch FROM now())::bigint);

  INSERT INTO public.sales (
    company_id,
    customer_id,
    sale_number,
    total_amount,
    paid_amount,
    status
  )
  VALUES (
    target_company_id,
    target_customer_id,
    current_sale_number,
    0,
    0,
    'pending'
  )
  RETURNING id INTO new_sale_id;

  FOR current_item IN
    SELECT value
    FROM jsonb_array_elements(sale_items_payload)
  LOOP
    current_product_id := (current_item ->> 'productId')::uuid;
    current_quantity := NULLIF(current_item ->> 'quantity', '')::numeric;
    current_unit_price := NULLIF(current_item ->> 'unitPrice', '')::numeric;

    IF current_product_id IS NULL THEN
      RAISE EXCEPTION 'Product id is required for each sale item';
    END IF;

    IF current_quantity IS NULL OR current_quantity <= 0 THEN
      RAISE EXCEPTION 'Sale item quantity must be greater than zero';
    END IF;

    IF current_unit_price IS NULL OR current_unit_price < 0 THEN
      RAISE EXCEPTION 'Sale item unit price must be zero or greater';
    END IF;

    SELECT *
    INTO product_row
    FROM public.products p
    WHERE p.id = current_product_id
      AND p.company_id = target_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product does not belong to current company';
    END IF;

    IF product_row.stock_quantity < current_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %', product_row.name;
    END IF;

    INSERT INTO public.sale_items (
      sale_id,
      product_id,
      quantity,
      unit_price,
      total_price
    )
    VALUES (
      new_sale_id,
      current_product_id,
      current_quantity,
      current_unit_price,
      current_quantity * current_unit_price
    );

    UPDATE public.products
    SET stock_quantity = stock_quantity - current_quantity
    WHERE id = current_product_id;

    INSERT INTO public.stock_movements (
      company_id,
      product_id,
      movement_type,
      quantity,
      reference_id,
      notes
    )
    VALUES (
      target_company_id,
      current_product_id,
      'out',
      current_quantity,
      new_sale_id,
      'Satis: ' || current_sale_number
    );
  END LOOP;

  UPDATE public.sales s
  SET total_amount = COALESCE((
    SELECT SUM(si.total_price)
    FROM public.sale_items si
    WHERE si.sale_id = new_sale_id
  ), 0)
  WHERE s.id = new_sale_id;

  RETURN new_sale_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_sale_with_restock(target_sale_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company_id uuid;
  sale_company_id uuid;
  current_item RECORD;
BEGIN
  SELECT uc.company_id
  INTO target_company_id
  FROM public.user_companies uc
  WHERE uc.user_id = auth.uid()
  ORDER BY uc.created_at ASC
  LIMIT 1;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'No company membership found for current user';
  END IF;

  SELECT s.company_id
  INTO sale_company_id
  FROM public.sales s
  WHERE s.id = target_sale_id;

  IF sale_company_id IS NULL THEN
    RAISE EXCEPTION 'Sale not found';
  END IF;

  IF sale_company_id <> target_company_id THEN
    RAISE EXCEPTION 'Sale does not belong to current company';
  END IF;

  FOR current_item IN
    SELECT si.product_id, si.quantity
    FROM public.sale_items si
    WHERE si.sale_id = target_sale_id
  LOOP
    UPDATE public.products p
    SET stock_quantity = stock_quantity + current_item.quantity
    WHERE p.id = current_item.product_id
      AND p.company_id = target_company_id;
  END LOOP;

  DELETE FROM public.stock_movements sm
  WHERE sm.reference_id = target_sale_id
    AND sm.company_id = target_company_id
    AND sm.movement_type = 'out';

  DELETE FROM public.sales s
  WHERE s.id = target_sale_id
    AND s.company_id = target_company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_sale_with_items(uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_sale_with_restock(uuid) TO authenticated;
