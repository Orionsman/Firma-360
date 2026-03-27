// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type DeleteAccountPayload = {
  reason?: string | null;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authHeader = request.headers.get('Authorization');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('Supabase environment variables are missing.');
    }

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required.' }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authenticated user could not be resolved.' }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const payload = (await request.json().catch(() => ({}))) as DeleteAccountPayload;
    const reason = payload.reason?.trim() || null;

    const { data: ownedCompanies, error: companyError } = await adminClient
      .from('companies')
      .select('id')
      .eq('owner_id', user.id);

    if (companyError) {
      throw companyError;
    }

    const companyIds = (ownedCompanies ?? []).map((company) => company.id);

    if (companyIds.length > 0) {
      const { error: deleteCompaniesError } = await adminClient
        .from('companies')
        .delete()
        .in('id', companyIds);

      if (deleteCompaniesError) {
        throw deleteCompaniesError;
      }
    }

    const { error: deleteMembershipsError } = await adminClient
      .from('user_companies')
      .delete()
      .eq('user_id', user.id);

    if (deleteMembershipsError) {
      throw deleteMembershipsError;
    }

    const { data: existingRequest } = await adminClient
      .from('account_deletion_requests')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing'])
      .maybeSingle();

    if (existingRequest?.id) {
      const { error: updateRequestError } = await adminClient
        .from('account_deletion_requests')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          notes: 'Account deleted by delete-account edge function.',
          reason,
        })
        .eq('id', existingRequest.id);

      if (updateRequestError) {
        throw updateRequestError;
      }
    } else {
      const { error: insertRequestError } = await adminClient
        .from('account_deletion_requests')
        .insert({
          user_id: user.id,
          user_email: user.email ?? null,
          company_id: companyIds[0] ?? null,
          company_name: null,
          reason,
          status: 'completed',
          requested_at: new Date().toISOString(),
          processed_at: new Date().toISOString(),
          notes: 'Account deleted by delete-account edge function.',
        });

      if (insertRequestError) {
        throw insertRequestError;
      }
    }

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(
      user.id
    );

    if (deleteUserError) {
      throw deleteUserError;
    }

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});
