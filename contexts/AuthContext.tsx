import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface Company {
  id: string;
  name: string;
  tax_number?: string;
  address?: string;
  phone?: string;
  email?: string;
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

interface AuthContextType {
  session: Session | null;
  user: User | null;
  company: Company | null;
  companies: CompanyMembership[];
  activeCompanyId: string | null;
  activeRole: CompanyMembership['role'] | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    companyName: string
  ) => Promise<SignUpResult>;
  createCompanyProfile: (companyName: string) => Promise<void>;
  createAdditionalCompany: (companyName: string) => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
  requestAccountDeletion: (reason?: string) => Promise<void>;
  deleteAccount: (reason?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshCompany: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ACTIVE_COMPANY_STORAGE_KEY = 'cepte_cari_active_company_id';

const getReadableAuthError = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : 'Beklenmeyen bir hata oluştu.';
  const lowered = message.toLowerCase();

  if (lowered.includes('email rate limit exceeded')) {
    return 'Çok fazla deneme yapıldı. Lütfen 1-2 dakika bekleyip tekrar deneyin.';
  }

  if (lowered.includes('invalid login credentials')) {
    return 'E-posta veya şifre hatalı.';
  }

  if (lowered.includes('email not confirmed')) {
    return 'E-posta adresinizi doğrulamanız gerekiyor.';
  }

  if (
    lowered.includes('row-level security') ||
    lowered.includes('permission denied') ||
    lowered.includes('42501') ||
    lowered.includes('forbidden') ||
    lowered.includes('403')
  ) {
    return 'Supabase yetki ayarı nedeniyle işlem tamamlanamadı. SQL policy ayarları düzeltilmeli veya kullanıcıya SQL Editor üzerinden firma bağlanmalı.';
  }

  if (
    lowered.includes('schema cache') ||
    (lowered.includes('function') && lowered.includes('not found'))
  ) {
    return 'Supabase fonksiyonu bulunamadı. Migration SQL dosyaları veritabanına uygulanmamış olabilir.';
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
  const [loading, setLoading] = useState(true);

  const syncUserContext = async (nextUser: User | null) => {
    setUser(nextUser);

    if (!nextUser) {
      setCompanies([]);
      setCompany(null);
      setActiveCompanyId(null);
      setActiveRole(null);
      await AsyncStorage.removeItem(ACTIVE_COMPANY_STORAGE_KEY);
      return;
    }

    await supabase.rpc('upsert_current_user_profile', {
      profile_full_name: nextUser.user_metadata?.full_name ?? null,
    });
    await supabase.rpc('accept_pending_team_invitations');

    const { data, error } = await supabase
      .from('user_companies')
      .select(
        'company_id, role, created_at, companies(id, name, tax_number, address, phone, email)'
      )
      .eq('user_id', nextUser.id)
      .order('created_at', { ascending: true });

    if (error) {
      setCompanies([]);
      setCompany(null);
      setActiveCompanyId(null);
      setActiveRole(null);
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

    setCompanies(memberships);
    setCompany((selectedMembership?.companies as Company | null) ?? null);
    setActiveCompanyId(selectedMembership?.company_id ?? null);
    setActiveRole(selectedMembership?.role ?? null);

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

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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
      throw new Error('Kayıt başarısız.');
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
    const resolvedUserId = getUserId(overrideUserId, user);

    if (!resolvedUserId) {
      throw new Error('Oturum bulunamadı. Lütfen yeniden giriş yapın.');
    }

    const trimmedName = companyName.trim();
    if (!trimmedName) {
      throw new Error('Firma adı boş olamaz.');
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
      throw new Error('Firma adı boş olamaz.');
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
          'company_id, role, created_at, companies(id, name, tax_number, address, phone, email)'
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
      throw new Error('Firma bulunamadı.');
    }

    setActiveCompanyId(companyId);
    setCompany(nextMembership.companies);
    setActiveRole(nextMembership.role);
    await AsyncStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, companyId);
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
    await AsyncStorage.removeItem(ACTIVE_COMPANY_STORAGE_KEY);
  };

  const refreshCompany = async () => {
    if (user) {
      await syncUserContext(user);
    }
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
        loading,
        signIn,
        signUp,
        createCompanyProfile,
        createAdditionalCompany,
        switchCompany,
        requestAccountDeletion,
        deleteAccount,
        signOut,
        refreshCompany,
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
