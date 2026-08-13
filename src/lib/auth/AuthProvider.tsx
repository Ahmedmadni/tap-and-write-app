/**
 * إدارة جلسة المستخدم + حالة البريميوم (الاشتراك) + صلاحية الأدمن.
 * الإعلانات إجبارية للجميع، ولا تختفي إلا لمشترك بريميوم فعّال.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
  provider: string | null;
  amount_usd: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isPremium: boolean;
  subscription: SubscriptionRow | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

function subActive(sub: SubscriptionRow | null): boolean {
  if (!sub) return false;
  if (sub.status !== "active") return false;
  if (!sub.current_period_end) return true;
  return new Date(sub.current_period_end).getTime() > Date.now();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);

  const loadProfileState = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setIsAdmin(false);
      setSubscription(null);
      return;
    }
    const [roles, sub] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    setIsAdmin(Boolean(roles.data?.some((r) => r.role === "admin")));
    setSubscription((sub.data as SubscriptionRow | null) ?? null);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setTimeout(() => void loadProfileState(next?.user?.id), 0);
    });
    void supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfileState(data.session?.user?.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfileState]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    await loadProfileState(data.session?.user?.id);
  }, [loadProfileState]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
    setSubscription(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      isAdmin,
      isPremium: isAdmin || subActive(subscription),
      subscription,
      refresh,
      signOut,
    }),
    [loading, session, isAdmin, subscription, refresh, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      loading: true,
      session: null,
      user: null,
      isAdmin: false,
      isPremium: false,
      subscription: null,
      refresh: async () => {},
      signOut: async () => {},
    };
  }
  return ctx;
}

/** هل يجب عرض الإعلانات؟ إجبارية للجميع إلا مشتركي البريميوم. */
export function useAdsEnabled(): boolean {
  const { isPremium } = useAuth();
  return !isPremium;
}
