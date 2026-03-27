/*
  # Add account deletion request flow

  Provides a store-review-friendly way for users to initiate account deletion
  from inside the app. The app records a deletion request that backend/admin
  tooling can process and complete.
*/

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name text,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  notes text
);

CREATE INDEX IF NOT EXISTS account_deletion_requests_user_id_idx
  ON public.account_deletion_requests(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_requests_one_open_request_idx
  ON public.account_deletion_requests(user_id)
  WHERE status IN ('pending', 'processing');

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own account deletion requests"
  ON public.account_deletion_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own account deletion requests"
  ON public.account_deletion_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.request_account_deletion(request_reason text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  existing_request_id uuid;
  target_company_id uuid;
  target_company_name text;
  current_user_email text;
  new_request_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT adr.id
  INTO existing_request_id
  FROM public.account_deletion_requests adr
  WHERE adr.user_id = current_user_id
    AND adr.status IN ('pending', 'processing')
  LIMIT 1;

  IF existing_request_id IS NOT NULL THEN
    RETURN existing_request_id;
  END IF;

  SELECT uc.company_id, c.name
  INTO target_company_id, target_company_name
  FROM public.user_companies uc
  LEFT JOIN public.companies c ON c.id = uc.company_id
  WHERE uc.user_id = current_user_id
  ORDER BY uc.created_at ASC
  LIMIT 1;

  current_user_email := auth.jwt() ->> 'email';

  INSERT INTO public.account_deletion_requests (
    user_id,
    user_email,
    company_id,
    company_name,
    reason
  )
  VALUES (
    current_user_id,
    current_user_email,
    target_company_id,
    target_company_name,
    NULLIF(trim(request_reason), '')
  )
  RETURNING id INTO new_request_id;

  RETURN new_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_account_deletion(text) TO authenticated;
