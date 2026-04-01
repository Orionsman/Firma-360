/*
  # Growth features: multi-company, team access, backups, and reminders
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view profiles from their companies"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT uc.user_id
      FROM public.user_companies uc
      WHERE uc.company_id IN (
        SELECT my_uc.company_id
        FROM public.user_companies my_uc
        WHERE my_uc.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can edit their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS team_invitations_unique_pending
  ON public.team_invitations(company_id, lower(email))
  WHERE status = 'pending';

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view invitations for their companies"
  ON public.team_invitations FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id
      FROM public.user_companies
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can create invitations"
  ON public.team_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id
      FROM public.user_companies
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update invitations"
  ON public.team_invitations FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id
      FROM public.user_companies
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id
      FROM public.user_companies
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE TABLE IF NOT EXISTS public.company_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  snapshot_name text NOT NULL,
  payload jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view company snapshots"
  ON public.company_snapshots FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id
      FROM public.user_companies
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can create company snapshots"
  ON public.company_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id
      FROM public.user_companies
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update company snapshots"
  ON public.company_snapshots FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id
      FROM public.user_companies
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id
      FROM public.user_companies
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners can delete company snapshots"
  ON public.company_snapshots FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id
      FROM public.user_companies
      WHERE user_id = auth.uid()
        AND role = 'owner'
    )
  );

CREATE TABLE IF NOT EXISTS public.collection_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  title text NOT NULL,
  note text,
  amount decimal(15,2) DEFAULT 0,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'dismissed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collection_reminders_company_due_date
  ON public.collection_reminders(company_id, due_date);

ALTER TABLE public.collection_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view collection reminders"
  ON public.collection_reminders FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id
      FROM public.user_companies
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create collection reminders"
  ON public.collection_reminders FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id
      FROM public.user_companies
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update collection reminders"
  ON public.collection_reminders FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id
      FROM public.user_companies
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id
      FROM public.user_companies
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete collection reminders"
  ON public.collection_reminders FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id
      FROM public.user_companies
      WHERE user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.upsert_current_user_profile(profile_full_name text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  current_email text;
BEGIN
  current_user_id := auth.uid();
  current_email := auth.jwt() ->> 'email';

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (current_user_id, current_email, NULLIF(trim(profile_full_name), ''))
  ON CONFLICT (user_id)
  DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(trim(EXCLUDED.full_name), ''), public.profiles.full_name),
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.create_additional_company_for_current_user(company_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  trimmed_name text;
  new_company_id uuid;
BEGIN
  current_user_id := auth.uid();
  trimmed_name := trim(company_name);

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF trimmed_name IS NULL OR trimmed_name = '' THEN
    RAISE EXCEPTION 'Company name is required';
  END IF;

  INSERT INTO public.companies (name, owner_id)
  VALUES (trimmed_name, current_user_id)
  RETURNING id INTO new_company_id;

  INSERT INTO public.user_companies (user_id, company_id, role)
  VALUES (current_user_id, new_company_id, 'owner')
  ON CONFLICT (user_id, company_id) DO NOTHING;

  RETURN new_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_pending_team_invitations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  current_email text;
  accepted_count integer := 0;
  invitation_record RECORD;
BEGIN
  current_user_id := auth.uid();
  current_email := lower(auth.jwt() ->> 'email');

  IF current_user_id IS NULL OR current_email IS NULL THEN
    RETURN 0;
  END IF;

  FOR invitation_record IN
    SELECT *
    FROM public.team_invitations
    WHERE lower(email) = current_email
      AND status = 'pending'
  LOOP
    INSERT INTO public.user_companies (user_id, company_id, role)
    VALUES (current_user_id, invitation_record.company_id, invitation_record.role)
    ON CONFLICT (user_id, company_id) DO UPDATE
      SET role = EXCLUDED.role;

    UPDATE public.team_invitations
    SET status = 'accepted',
        accepted_by = current_user_id,
        accepted_at = now()
    WHERE id = invitation_record.id;

    accepted_count := accepted_count + 1;
  END LOOP;

  RETURN accepted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_company_snapshot(target_company_id uuid, requested_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  snapshot_id uuid;
  snapshot_name text;
  payload jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_companies
    WHERE user_id = auth.uid()
      AND company_id = target_company_id
      AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'You do not have access to snapshot this company';
  END IF;

  snapshot_name := COALESCE(NULLIF(trim(requested_name), ''), 'Yedek ' || to_char(now(), 'YYYY-MM-DD HH24:MI'));

  payload := jsonb_build_object(
    'company',
    (
      SELECT to_jsonb(c)
      FROM public.companies c
      WHERE c.id = target_company_id
    ),
    'customers',
    COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM public.customers c WHERE c.company_id = target_company_id), '[]'::jsonb),
    'suppliers',
    COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM public.suppliers s WHERE s.company_id = target_company_id), '[]'::jsonb),
    'products',
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM public.products p WHERE p.company_id = target_company_id), '[]'::jsonb),
    'sales',
    COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM public.sales s WHERE s.company_id = target_company_id), '[]'::jsonb),
    'sale_items',
    COALESCE((
      SELECT jsonb_agg(to_jsonb(si))
      FROM public.sale_items si
      WHERE si.sale_id IN (SELECT id FROM public.sales WHERE company_id = target_company_id)
    ), '[]'::jsonb),
    'payments',
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM public.payments p WHERE p.company_id = target_company_id), '[]'::jsonb),
    'stock_movements',
    COALESCE((SELECT jsonb_agg(to_jsonb(sm)) FROM public.stock_movements sm WHERE sm.company_id = target_company_id), '[]'::jsonb),
    'collection_reminders',
    COALESCE((SELECT jsonb_agg(to_jsonb(cr)) FROM public.collection_reminders cr WHERE cr.company_id = target_company_id), '[]'::jsonb)
  );

  INSERT INTO public.company_snapshots (company_id, snapshot_name, payload, created_by)
  VALUES (target_company_id, snapshot_name, payload, auth.uid())
  RETURNING id INTO snapshot_id;

  RETURN snapshot_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_company_snapshot(target_snapshot_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company_id uuid;
  snapshot_payload jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT cs.company_id, cs.payload
  INTO target_company_id, snapshot_payload
  FROM public.company_snapshots cs
  WHERE cs.id = target_snapshot_id;

  IF target_company_id IS NULL OR snapshot_payload IS NULL THEN
    RAISE EXCEPTION 'Snapshot not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_companies
    WHERE user_id = auth.uid()
      AND company_id = target_company_id
      AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'You do not have access to restore this company';
  END IF;

  UPDATE public.companies
  SET name = COALESCE(snapshot_payload -> 'company' ->> 'name', name),
      tax_number = snapshot_payload -> 'company' ->> 'tax_number',
      address = snapshot_payload -> 'company' ->> 'address',
      phone = snapshot_payload -> 'company' ->> 'phone',
      email = snapshot_payload -> 'company' ->> 'email'
  WHERE id = target_company_id;

  DELETE FROM public.collection_reminders WHERE company_id = target_company_id;
  DELETE FROM public.payments WHERE company_id = target_company_id;
  DELETE FROM public.stock_movements WHERE company_id = target_company_id;
  DELETE FROM public.sale_items
  WHERE sale_id IN (SELECT id FROM public.sales WHERE company_id = target_company_id);
  DELETE FROM public.sales WHERE company_id = target_company_id;
  DELETE FROM public.customers WHERE company_id = target_company_id;
  DELETE FROM public.suppliers WHERE company_id = target_company_id;
  DELETE FROM public.products WHERE company_id = target_company_id;

  INSERT INTO public.customers (id, company_id, name, email, phone, address, tax_number, balance, created_at)
  SELECT id, company_id, name, email, phone, address, tax_number, balance, created_at
  FROM jsonb_to_recordset(COALESCE(snapshot_payload -> 'customers', '[]'::jsonb)) AS x(
    id uuid,
    company_id uuid,
    name text,
    email text,
    phone text,
    address text,
    tax_number text,
    balance numeric,
    created_at timestamptz
  );

  INSERT INTO public.suppliers (id, company_id, name, email, phone, address, tax_number, balance, created_at)
  SELECT id, company_id, name, email, phone, address, tax_number, balance, created_at
  FROM jsonb_to_recordset(COALESCE(snapshot_payload -> 'suppliers', '[]'::jsonb)) AS x(
    id uuid,
    company_id uuid,
    name text,
    email text,
    phone text,
    address text,
    tax_number text,
    balance numeric,
    created_at timestamptz
  );

  INSERT INTO public.products (id, company_id, name, code, description, unit, purchase_price, sale_price, stock_quantity, min_stock_level, created_at)
  SELECT id, company_id, name, code, description, unit, purchase_price, sale_price, stock_quantity, min_stock_level, created_at
  FROM jsonb_to_recordset(COALESCE(snapshot_payload -> 'products', '[]'::jsonb)) AS x(
    id uuid,
    company_id uuid,
    name text,
    code text,
    description text,
    unit text,
    purchase_price numeric,
    sale_price numeric,
    stock_quantity numeric,
    min_stock_level numeric,
    created_at timestamptz
  );

  INSERT INTO public.sales (id, company_id, customer_id, sale_number, sale_date, total_amount, paid_amount, status, notes, created_at)
  SELECT id, company_id, customer_id, sale_number, sale_date, total_amount, paid_amount, status, notes, created_at
  FROM jsonb_to_recordset(COALESCE(snapshot_payload -> 'sales', '[]'::jsonb)) AS x(
    id uuid,
    company_id uuid,
    customer_id uuid,
    sale_number text,
    sale_date date,
    total_amount numeric,
    paid_amount numeric,
    status text,
    notes text,
    created_at timestamptz
  );

  INSERT INTO public.sale_items (id, sale_id, product_id, quantity, unit_price, total_price)
  SELECT id, sale_id, product_id, quantity, unit_price, total_price
  FROM jsonb_to_recordset(COALESCE(snapshot_payload -> 'sale_items', '[]'::jsonb)) AS x(
    id uuid,
    sale_id uuid,
    product_id uuid,
    quantity numeric,
    unit_price numeric,
    total_price numeric
  );

  INSERT INTO public.payments (id, company_id, customer_id, supplier_id, sale_id, amount, payment_date, payment_type, payment_method, description, created_at)
  SELECT id, company_id, customer_id, supplier_id, sale_id, amount, payment_date, payment_type, payment_method, description, created_at
  FROM jsonb_to_recordset(COALESCE(snapshot_payload -> 'payments', '[]'::jsonb)) AS x(
    id uuid,
    company_id uuid,
    customer_id uuid,
    supplier_id uuid,
    sale_id uuid,
    amount numeric,
    payment_date date,
    payment_type text,
    payment_method text,
    description text,
    created_at timestamptz
  );

  INSERT INTO public.stock_movements (id, company_id, product_id, movement_type, quantity, movement_date, reference_id, notes, created_at)
  SELECT id, company_id, product_id, movement_type, quantity, movement_date, reference_id, notes, created_at
  FROM jsonb_to_recordset(COALESCE(snapshot_payload -> 'stock_movements', '[]'::jsonb)) AS x(
    id uuid,
    company_id uuid,
    product_id uuid,
    movement_type text,
    quantity numeric,
    movement_date date,
    reference_id uuid,
    notes text,
    created_at timestamptz
  );

  INSERT INTO public.collection_reminders (id, company_id, customer_id, sale_id, title, note, amount, due_date, status, created_by, completed_at, created_at)
  SELECT id, company_id, customer_id, sale_id, title, note, amount, due_date, status, created_by, completed_at, created_at
  FROM jsonb_to_recordset(COALESCE(snapshot_payload -> 'collection_reminders', '[]'::jsonb)) AS x(
    id uuid,
    company_id uuid,
    customer_id uuid,
    sale_id uuid,
    title text,
    note text,
    amount numeric,
    due_date date,
    status text,
    created_by uuid,
    completed_at timestamptz,
    created_at timestamptz
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_current_user_profile(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_additional_company_for_current_user(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_pending_team_invitations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_company_snapshot(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_company_snapshot(uuid) TO authenticated;
