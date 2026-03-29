import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
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

interface SignUpResult {
  requiresEmailConfirmation: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  company: Company | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    companyName: string
  ) => Promise<SignUpResult>;
  createCompanyProfile: (companyName: string) => Promise<void>;
  requestAccountDeletion: (reason?: string) => Promise<void>;
  deleteAccount: (reason?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshCompany: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getReadableAuthError = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : 'Beklenmeyen bir hata olustu.';
  const lowered = message.toLowerCase();

  if (lowered.includes('email rate limit exceeded')) {
    return 'Cok fazla deneme yapildi. Lutfen 1-2 dakika bekleyip tekrar deneyin.';
  }

  if (lowered.includes('invalid login credentials')) {
    return 'E-posta veya sifre hatali.';
  }

  if (lowered.includes('email not confirmed')) {
    return 'E-posta adresinizi dogrulamaniz gerekiyor.';
  }

  if (
    lowered.includes('row-level security') ||
    lowered.includes('permission denied') ||
    lowered.includes('42501') ||
    lowered.includes('forbidden') ||
    lowered.includes('403')
  ) {
    return 'Supabase yetki ayari nedeniyle islem tamamlanamadi. SQL policy ayarlari duzeltilmeli veya kullaniciya SQL Editor uzerinden firma baglanmali.';
  }

  if (
    lowered.includes('schema cache') ||
    lowered.includes('function') && lowered.includes('not found')
  ) {
    return 'Supabase fonksiyonu bulunamadi. Migration SQL dosyalari veritabanina uygulanmamis olabilir.';
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
  const [loading, setLoading] = useState(true);

  const fetchCompany = async (userId: string) => {
    const { data } = await supabase
      .from('user_companies')
      .select(
        'company_id, companies(id, name, tax_number, address, phone, email)'
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (data?.companies) {
      setCompany(data.companies as unknown as Company);
    } else {
      setCompany(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        fetchCompany(nextSession.user.id);
      }

      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      (async () => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        if (nextSession?.user) {
          await fetchCompany(nextSession.user.id);
        } else {
          setCompany(null);
        }
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
      throw new Error('Kayit basarisiz.');
    }

    if (!authData.session) {
      return { requiresEmailConfirmation: true };
    }

    setSession(authData.session);
    setUser(authData.user);

    await createCompanyProfile(companyName, authData.user.id);
    await fetchCompany(authData.user.id);

    return { requiresEmailConfirmation: false };
  };

  const createCompanyProfile = async (
    companyName: string,
    overrideUserId?: string
  ) => {
    const resolvedUserId = getUserId(overrideUserId, user);

    if (!resolvedUserId) {
      throw new Error('Oturum bulunamadi. Lutfen yeniden giris yapin.');
    }

    const trimmedName = companyName.trim();
    if (!trimmedName) {
      throw new Error('Firma adi bos olamaz.');
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

    await fetchCompany(resolvedUserId);
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
  };

  const refreshCompany = async () => {
    const resolvedUserId = getUserId(undefined, user);
    if (resolvedUserId) {
      await fetchCompany(resolvedUserId);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        company,
        loading,
        signIn,
        signUp,
        createCompanyProfile,
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
