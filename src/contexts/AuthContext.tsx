import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, User } from '../lib/supabase';
import { databaseManager } from '../lib/database';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initTenantDb = async (userId: string) => {
      try {
        console.log(`[${new Date().toLocaleTimeString('en-GB')}] 🏦 Fetching tenant info for user: ${userId}`);

        // Fetch profile with tenant info
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select(`
            tenant_id,
            tenants (
              id,
              turso_url,
              turso_token
            )
          `)
          .eq('id', userId)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST205') {
            console.error('❌ Supabase Schema Cache Error: Please refresh your Supabase Dashboard or wait 2 minutes for the new tables to be recognized.');
          } else {
            console.error('Error fetching tenant/profile info:', profileError);
          }
          return;
        }

        if (!profile?.tenants) {
          console.error('❌ No tenant found for this user. Have you linked the user to a tenant in the Supabase database?');
          return;
        }

        const tenant = profile.tenants as any;
        if (!tenant.turso_url || !tenant.turso_token) {
          console.error('❌ Tenant found but Turso credentials are missing in Supabase.');
          return;
        }

        await databaseManager.initialize(
          tenant.id,
          tenant.turso_url,
          tenant.turso_token,
          userId
        );

        // Trigger initial sync in the background after 3 seconds
        setTimeout(async () => {
          try {
            console.log(`[${new Date().toLocaleTimeString('en-GB')}] 🔄 Triggering background auto-sync...`);
            await databaseManager.pull();
            console.log(`[${new Date().toLocaleTimeString('en-GB')}] ✅ Background auto-sync completed`);
          } catch (e) {
            console.warn(`[${new Date().toLocaleTimeString('en-GB')}] ⚠️ Background sync failed (this is normal if Turso is busy):`, e);
          }
        }, 3000);
      } catch (err) {
        console.error('Failed to initialize multi-tenant DB:', err);
      }
    };

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        console.log(`[${new Date().toLocaleTimeString('en-GB')}] 👤 User ID obtained from session: ${session.user.id}`);
        setUser({
          id: session.user.id,
          email: session.user.email!,
          created_at: session.user.created_at,
        });
        initTenantDb(session.user.id);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        console.log(`[${new Date().toLocaleTimeString('en-GB')}] 👤 User ID obtained on SIGNED_IN: ${session.user.id}`);
        setUser({
          id: session.user.id,
          email: session.user.email!,
          created_at: session.user.created_at,
        });
        await initTenantDb(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        await databaseManager.close();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await databaseManager.push(); // Push any pending changes
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      signIn,
      signUp,
      signOut,
    }}>
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
