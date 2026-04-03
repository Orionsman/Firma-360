CREATE OR REPLACE FUNCTION public.delete_company_for_current_user(target_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.companies
    WHERE id = target_company_id
      AND owner_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Only the company owner can delete this company';
  END IF;

  DELETE FROM public.companies
  WHERE id = target_company_id
    AND owner_id = current_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_company_member(
  target_company_id uuid,
  target_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_role text;
  target_role text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT role
  INTO current_role
  FROM public.user_companies
  WHERE company_id = target_company_id
    AND user_id = current_user_id;

  IF current_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'You are not authorized to manage this team';
  END IF;

  SELECT role
  INTO target_role
  FROM public.user_companies
  WHERE company_id = target_company_id
    AND user_id = target_user_id;

  IF target_role IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF target_role = 'owner' THEN
    RAISE EXCEPTION 'Company owner cannot be removed';
  END IF;

  IF current_role = 'admin' AND target_role = 'admin' THEN
    RAISE EXCEPTION 'Admins cannot remove other admins';
  END IF;

  DELETE FROM public.user_companies
  WHERE company_id = target_company_id
    AND user_id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_team_invitation(target_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  target_company_id uuid;
  current_role text;
  invitation_role text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT company_id, role
  INTO target_company_id, invitation_role
  FROM public.team_invitations
  WHERE id = target_invitation_id;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  SELECT role
  INTO current_role
  FROM public.user_companies
  WHERE company_id = target_company_id
    AND user_id = current_user_id;

  IF current_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'You are not authorized to revoke this invitation';
  END IF;

  IF current_role = 'admin' AND invitation_role = 'admin' THEN
    RAISE EXCEPTION 'Admins cannot revoke admin invitations';
  END IF;

  UPDATE public.team_invitations
  SET status = 'revoked'
  WHERE id = target_invitation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_company_for_current_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_company_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_team_invitation(uuid) TO authenticated;
