import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import { t } from '@/lib/i18n';
import { flushOfflineMutations } from '@/lib/offlineWriteQueue';
import { supabase } from '@/lib/supabase';

interface Company {
  id: string;
  name: string;
  tax_number?: string;
  address?: string;
  phone?: string;
  email?: string;
  subscription_plan?: 'free' | 'pro';
}

interface CompanyMembership {
  company_id: string;
  role: 'owner' | 'admin' | 'user';
  created_at?: string;
  companies: Company | null;
}

interface SignUpResult {
  requiresEmailConfirmation: boolean;
}

interface RecentAcceptedInvitation {
  company_id: string;
  accepted_at?: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  company: Company | null;
  companies: CompanyMembership[];
  activeCompanyId: string | null;
  activeRole: CompanyMembership['role'] | null;
  isProCompany: boolean;
  recentAcceptedCompanies: CompanyMembership[];
  noCompanyAccess: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    companyName: string
  ) => Promise<SignUpResult>;
  createCompanyProfile: (companyName: string) => Promise<void>;
  createAdditionalCompany: (companyName: string) => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
  deleteCompany: (companyId: string) => Promise<void>;
  removeCompanyMember: (companyId: string, userId: string) => Promise<void>;
  revokeInvitation: (invitationId: string) => Promise<void>;
  requestAccountDeletion: (reason?: string) => Promise<void>;
  deleteAccount: (reason?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshCompany: () => Promise<void>;
  dismissAcceptedCompaniesNotice: (companyId?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ACTIVE_COMPANY_STORAGE_KEY = 'cepte_cari_active_company_id';

const getAuthParamsFromUrl = (url: string) => {
  const [baseWithQuery, hash = ''] = url.split('#');
  const queryString = baseWithQuery.includes('?')
    ? baseWithQuery.split('?')[1]
    : '';
  const searchParams = new URLSearchParams(
    [queryString, hash].filter(Boolean).join('&')
  );

  return {
    accessToken: searchParams.get('access_token'),
    refreshToken: searchParams.get('refresh_token'),
    type: searchParams.get('type'),
    code: searchParams.get('code'),
  };
};

const getReadableAuthError = (error: unknown) => {
  const isTr = t.locale() === 'tr';
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : isTr
          ? 'Beklenmeyen bir hata oluştu.'
          : 'An unexpected error occurred.';
  const lowered = message.toLowerCase();

  if (lowered.includes('email rate limit exceeded')) {
    return isTr
      ? 'Çok fazla deneme yapıldı. Lütfen 1-2 dakika bekleyip tekrar deneyin.'
      : 'Too many attempts were made. Please wait 1-2 minutes and try again.';
  }

  if (lowered.includes('invalid login credentials')) {
    return isTr ? 'E-posta veya şifre hatalı.' : 'Incorrect email or password.';
  }

  if (lowered.includes('email not confirmed')) {
    return isTr
      ? 'E-posta adresinizi doğrulamanız gerekiyor.'
      : 'You need to verify your email address.';
  }

  if (
    lowered.includes('row-level security') ||
    lowered.includes('permission denied') ||
    lowered.includes('42501') ||
    lowered.includes('forbidden') ||
    lowered.includes('403')
  ) {
    return isTr
      ? 'Supabase yetki ayarı nedeniyle işlem tamamlanamadı. SQL policy ayarları düzeltilmeli veya kullanıcıya SQL Editor üzerinden firma bağlanmalı.'
      : 'The operation could not be completed due to Supabase permission settings. SQL policies must be fixed or the user must be linked to a company through the SQL Editor.';
  }

  if (
    lowered.includes('schema cache') ||
    (lowered.includes('function') && lowered.includes('not found'))
  ) {
    return isTr
      ? 'Supabase fonksiyonu bulunamadı. Migration SQL dosyaları veritabanına uygulanmamış olabilir.'
      : 'The Supabase function could not be found. Migration SQL files may not have been applied to the database.';
  }

  return message;
};

const getUserId = (
  overrideUserId?: string,
  fallbackUser?: User | null
) => overrideUserId ?? fallbackUser?.id ?? null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<CompanyMembership[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<CompanyMembership['role'] | null>(null);
  const [recentAcceptedCompanies, setRecentAcceptedCompanies] = useState<CompanyMembership[]>([]);
  const [noCompanyAccess, setNoCompanyAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const flushInFlightRef = useRef(false);

  const flushQueuedWrites = async () => {
    if (flushInFlightRef.current) {
      return;
    }

    flushInFlightRef.current = true;
    try {
      await flushOfflineMutations();
    } finally {
      flushInFlightRef.current = false;
    }
  };

  const syncUserContext = async (nextUser: User | null) => {
    setUser(nextUser);

    if (!nextUser) {
      setCompanies([]);
      setCompany(null);
      setActiveCompanyId(null);
      setActiveRole(null);
      setRecentAcceptedCompanies([]);
      setNoCompanyAccess(false);
      await AsyncStorage.removeItem(ACTIVE_COMPANY_STORAGE_KEY);
      return;
    }

    await flushQueuedWrites();

    await supabase.rpc('upsert_current_user_profile', {
      profile_full_name: nextUser.user_metadata?.full_name ?? null,
    });
    const { data: acceptedCountData } = await supabase.rpc('accept_pending_team_invitations');
    const acceptedCount =
      typeof acceptedCountData === 'number'
        ? acceptedCountData
        : Number(acceptedCountData ?? 0) || 0;

    const { data, error } = await supabase
      .from('user_companies')
      .select(
        'company_id, role, created_at, companies(id, name, tax_number, address, phone, email, subscription_plan)'
      )
      .eq('user_id', nextUser.id)
      .order('created_at', { ascending: true });

    if (error) {
      setCompanies([]);
      setCompany(null);
      setActiveCompanyId(null);
      setActiveRole(null);
      setNoCompanyAccess(false);
      return;
    }

    const memberships = (((data as unknown) as CompanyMembership[] | null) ?? []).map((membership) => ({
      ...membership,
      companies: Array.isArray(membership.companies)
        ? (membership.companies[0] as Company | undefined) ?? null
        : membership.companies,
    })).filter(
      (membership) => membership.companies
    );
    const storedCompanyId = await AsyncStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
    const selectedMembership =
      memberships.find((membership) => membership.company_id === storedCompanyId) ||
      memberships[0] ||
      null;

    setNoCompanyAccess(memberships.length === 0);

    setCompanies(memberships);
    setCompany((selectedMembership?.companies as Company | null) ?? null);
    setActiveCompanyId(selectedMembership?.company_id ?? null);
    setActiveRole(selectedMembership?.role ?? null);

    if (acceptedCount > 0) {
      const acceptedAfter = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: acceptedInvitations } = await supabase
        .from('team_invitations')
        .select('company_id, accepted_at')
        .eq('accepted_by', nextUser.id)
        .eq('status', 'accepted')
        .gte('accepted_at', acceptedAfter)
        .order('accepted_at', { ascending: false });

      const acceptedCompanyIds = new Set(
        (((acceptedInvitations as unknown) as RecentAcceptedInvitation[] | null) ?? []).map(
          (invitation) => invitation.company_id
        )
      );

      if (acceptedCompanyIds.size > 0) {
        setRecentAcceptedCompanies(
          memberships.filter((membership) => acceptedCompanyIds.has(membership.company_id))
        );
      }
    }

    if (selectedMembership?.company_id) {
      await AsyncStorage.setItem(
        ACTIVE_COMPANY_STORAGE_KEY,
        selectedMembership.company_id
      );
    } else {
      await AsyncStorage.removeItem(ACTIVE_COMPANY_STORAGE_KEY);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      setSession(nextSession);
      void syncUserContext(nextSession?.user ?? null).finally(() => {
        setLoading(false);
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      (async () => {
        setSession(nextSession);
        await syncUserContext(nextSession?.user ?? null);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleIncomingUrl = async (url: string | null) => {
      if (!url || !url.includes('reset-password')) {
        return;
      }

      const { accessToken, refreshToken, code } = getAuthParamsFromUrl(url);

      try {
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
          return;
        }

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }
      } catch {
        // Reset password screen will surface invalid-link feedback when needed.
      }
    };

    void Linking.getInitialURL().then(handleIncomingUrl);

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleIncomingUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    void flushQueuedWrites();

    const interval = setInterval(() => {
      void flushQueuedWrites();
    }, 45000);

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void flushQueuedWrites();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [user]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(getReadableAuthError(error));
    }
  };

  const requestPasswordReset = async (email: string) => {
    const redirectTo = Linking.createURL('reset-password');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      throw new Error(getReadableAuthError(error));
    }
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      throw new Error(getReadableAuthError(error));
    }
  };

  const signUp = async (
    email: string,
    password: string,
    companyName: string
  ) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      throw new Error(getReadableAuthError(authError));
    }

    if (!authData.user) {
      throw new Error(t.locale() === 'tr' ? 'Kayıt başarısız.' : 'Registration failed.');
    }

    if (!authData.session) {
      return { requiresEmailConfirmation: true };
    }

    setSession(authData.session);

    await createCompanyProfile(companyName, authData.user.id);
    await syncUserContext(authData.user);

    return { requiresEmailConfirmation: false };
  };

  const createCompanyProfile = async (
    companyName: string,
    overrideUserId?: string
  ) => {
    const isTr = t.locale() === 'tr';
    const resolvedUserId = getUserId(overrideUserId, user);

    if (!resolvedUserId) {
      throw new Error(
        isTr ? 'Oturum bulunamadı. Lütfen yeniden giriş yapın.' : 'No session found. Please sign in again.'
      );
    }

    const trimmedName = companyName.trim();
    if (!trimmedName) {
      throw new Error(isTr ? 'Firma adı boş olamaz.' : 'Company name cannot be empty.');
    }

    const { data: existingMembership, error: membershipError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', resolvedUserId)
      .maybeSingle();

    if (membershipError) {
      throw new Error(getReadableAuthError(membershipError));
    }

    if (existingMembership?.company_id) {
      await refreshCompany();
      return;
    }

    const { error: rpcError } = await supabase.rpc(
      'create_company_for_current_user',
      {
        company_name: trimmedName,
      }
    );

    if (rpcError) {
      throw new Error(getReadableAuthError(rpcError));
    }

    if (resolvedUserId === user?.id) {
      await syncUserContext(user);
    }
  };

  const createAdditionalCompany = async (companyName: string) => {
    const trimmedName = companyName.trim();
    if (!trimmedName) {
      throw new Error(t.locale() === 'tr' ? 'Firma adı boş olamaz.' : 'Company name cannot be empty.');
    }

    const { data, error } = await supabase.rpc(
      'create_additional_company_for_current_user',
      {
        company_name: trimmedName,
      }
    );

    if (error) {
      throw new Error(getReadableAuthError(error));
    }

    await syncUserContext(user);
    if (data) {
      await switchCompany(data as string);
    }
  };

  const switchCompany = async (companyId: string) => {
    let nextMembership =
      companies.find((membership) => membership.company_id === companyId) || null;

    if (!nextMembership && user) {
      const { data } = await supabase
        .from('user_companies')
        .select(
          'company_id, role, created_at, companies(id, name, tax_number, address, phone, email, subscription_plan)'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      const memberships = (((data as unknown) as CompanyMembership[] | null) ?? []).map((membership) => ({
        ...membership,
        companies: Array.isArray(membership.companies)
          ? (membership.companies[0] as Company | undefined) ?? null
          : membership.companies,
      })).filter(
        (membership) => membership.companies
      );
      setCompanies(memberships);
      nextMembership =
        memberships.find((membership) => membership.company_id === companyId) || null;
    }

    if (!nextMembership?.companies) {
      throw new Error(t.locale() === 'tr' ? 'Firma bulunamadı.' : 'Company not found.');
    }

    setActiveCompanyId(companyId);
    setCompany(nextMembership.companies);
    setActiveRole(nextMembership.role);
    setNoCompanyAccess(false);
    setRecentAcceptedCompanies((current) =>
      current.filter((membership) => membership.company_id !== companyId)
    );
    await AsyncStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, companyId);
  };

  const deleteCompany = async (companyId: string) => {
    const { error } = await supabase.rpc('delete_company_for_current_user', {
      target_company_id: companyId,
    });

    if (error) {
      throw new Error(getReadableAuthError(error));
    }

    await syncUserContext(user);
  };

  const removeCompanyMember = async (companyId: string, userId: string) => {
    const { error } = await supabase.rpc('remove_company_member', {
      target_company_id: companyId,
      target_user_id: userId,
    });

    if (error) {
      throw new Error(getReadableAuthError(error));
    }

    await syncUserContext(user);
  };

  const revokeInvitation = async (invitationId: string) => {
    const { error } = await supabase.rpc('revoke_team_invitation', {
      target_invitation_id: invitationId,
    });

    if (error) {
      throw new Error(getReadableAuthError(error));
    }

    await syncUserContext(user);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  };

  const requestAccountDeletion = async (reason?: string) => {
    const { error } = await supabase.rpc('request_account_deletion', {
      request_reason: reason?.trim() || null,
    });

    if (error) {
      throw new Error(getReadableAuthError(error));
    }
  };

  const deleteAccount = async (reason?: string) => {
    const { error } = await supabase.functions.invoke('delete-account', {
      body: {
        reason: reason?.trim() || null,
      },
    });

    if (error) {
      throw new Error(getReadableAuthError(error));
    }

    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setCompany(null);
    setCompanies([]);
    setActiveCompanyId(null);
    setActiveRole(null);
    setRecentAcceptedCompanies([]);
    setNoCompanyAccess(false);
    await AsyncStorage.removeItem(ACTIVE_COMPANY_STORAGE_KEY);
  };

  const refreshCompany = async () => {
    if (user) {
      await syncUserContext(user);
    }
  };

  const dismissAcceptedCompaniesNotice = (companyId?: string) => {
    if (!companyId) {
      setRecentAcceptedCompanies([]);
      return;
    }

    setRecentAcceptedCompanies((current) =>
      current.filter((membership) => membership.company_id !== companyId)
    );
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        company,
        companies,
        activeCompanyId,
        activeRole,
        isProCompany: company?.subscription_plan === 'pro',
        recentAcceptedCompanies,
        noCompanyAccess,
        loading,
        signIn,
        requestPasswordReset,
        updatePassword,
        signUp,
        createCompanyProfile,
        createAdditionalCompany,
        switchCompany,
        deleteCompany,
        removeCompanyMember,
        revokeInvitation,
        requestAccountDeletion,
        deleteAccount,
        signOut,
        refreshCompany,
        dismissAcceptedCompaniesNotice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
