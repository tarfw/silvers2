import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase, User } from '../lib/supabase';
import { databaseManager } from '../lib/database';

// Triggering a refresh to clear stale Metro cache

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  db: any | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [db, setDb] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializingRef = useRef<boolean>(false);
  const currentSessionUserRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const handleSync = async () => {
      if (databaseManager.getDatabase()) {
        try {
          console.log(`[${new Date().toLocaleTimeString('en-GB')}] 🔄 Auto-sync triggered...`);
          await databaseManager.sync();
        } catch (err) {
          console.warn('Auto-sync failed:', err);
        }
      }
    };

    const initTenantDb = async (userId: string, email: string, name: string) => {
      // Prevent parallel initializations for the same user
      if (isInitializingRef.current) {
        console.log(`[${new Date().toLocaleTimeString('en-GB')}] ⏳ Auth init already in progress, skipping duplicate call...`);
        return;
      }

      isInitializingRef.current = true;
      currentSessionUserRef.current = userId;

      // Clear any pending sync from a previous attempt/session
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      try {
        console.log(`[${new Date().toLocaleTimeString('en-GB')}] 🏦 Initializing database for user: ${userId}`);

        const initializedDb = await databaseManager.initialize(userId, email, name);
        setDb(initializedDb);

        // Start heartbeat sync every 5 minutes
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = setInterval(handleSync, 5 * 60 * 1000);

        /* Initial sync moved to useTasks hook to ensure proper UI coordination */
      } catch (err) {
        console.error('Failed to initialize database:', err);
      } finally {
        isInitializingRef.current = false;
      }
    };

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log(`[${new Date().toLocaleTimeString('en-GB')}] 👤 User ID from session: ${session.user.id}`);
          setUser({
            id: session.user.id,
            email: session.user.email!,
            created_at: session.user.created_at,
          });
          const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Self';
          await initTenantDb(session.user.id, session.user.email!, name);
        }
      } catch (err) {
        console.error('Session check failed:', err);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();

    // AppState Listener for lifecycle-triggered sync
    const subscriptionAppState = AppState.addEventListener('change', nextAppState => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[AuthContext] App has come to the foreground, triggering sync...');
        handleSync();
      }
      appStateRef.current = nextAppState;
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
        const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Self';
        await initTenantDb(session.user.id, session.user.email!, name);
      } else if (event === 'SIGNED_OUT') {
        currentSessionUserRef.current = null;
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = null;
        }
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        setUser(null);
        setDb(null);
        await databaseManager.close();
      }
    });

    return () => {
      subscription.unsubscribe();
      subscriptionAppState.remove();
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
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
    try {
      // Attempt to push pending changes with a 2-second timeout
      // This ensures sign-out isn't blocked if the network is flaky or Turso is busy
      await Promise.race([
        databaseManager.push(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Push timeout')), 2000))
      ]).catch(err => console.warn('Sign-out: push failed or timed out:', err));

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.error('Sign-out failed:', err);
      // Even if error, we might want to force state reset
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      db,
      isLoading,
      isAuthenticated: !!user,
      isAdmin: user?.email === 'skjsilverssmith@gmail.com',
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
