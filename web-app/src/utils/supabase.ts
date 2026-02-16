/**
 * Supabase client configuration for real-time sync
 * Handles database connections and Realtime subscriptions
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BACKEND_URL } from '../config';

let supabaseClient: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient | null> | null = null;

/**
 * Fetch Supabase credentials from backend
 */
async function fetchSupabaseConfig(): Promise<{ url: string; anonKey: string } | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/config/supabase`);
    const data = await response.json();

    if (data.success && data.realtime_available) {
      return {
        url: data.supabase_url,
        anonKey: data.supabase_anon_key,
      };
    }

    console.warn('[Supabase] Backend does not have Realtime configured');
    return null;
  } catch (error) {
    console.error('[Supabase] Failed to fetch config from backend:', error);
    return null;
  }
}

/**
 * Get or create Supabase client instance
 * Returns null if credentials are not configured
 */
export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  // Return cached client if already initialized
  if (supabaseClient) {
    return supabaseClient;
  }

  // Return existing init promise if already fetching
  if (initPromise) {
    return initPromise;
  }

  // Fetch credentials and initialize client
  initPromise = (async () => {
    const config = await fetchSupabaseConfig();
    if (!config) {
      console.warn('[Supabase] Credentials not available - Realtime features disabled');
      return null;
    }

    try {
      supabaseClient = createClient(config.url, config.anonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10, // Rate limit for updates
          },
        },
      });

      console.log('[Supabase] Client initialized successfully');
      return supabaseClient;
    } catch (error) {
      console.error('[Supabase] Failed to initialize client:', error);
      return null;
    }
  })();

  return initPromise;
}

/**
 * Check if Supabase Realtime is available
 */
export async function isRealtimeAvailable(): Promise<boolean> {
  const client = await getSupabaseClient();
  return client !== null;
}

/**
 * Subscribe to changes on saved_items table for a specific user
 * Returns unsubscribe function (or null if Realtime not available)
 */
export async function subscribeToSavedItems(
  userId: string,
  onUpdate: () => void
): Promise<(() => void) | null> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    console.warn('[Supabase] Realtime not available - falling back to polling');
    return null;
  }

  console.log('[Supabase] Setting up Realtime subscription for user:', userId);

  const channel = supabase
    .channel('saved_items_changes')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'saved_items',
        filter: `user_id=eq.${userId}`, // Only this user's items
      },
      (payload) => {
        console.log('[Supabase] Realtime update received:', payload.eventType, payload.new || payload.old);
        onUpdate(); // Trigger refresh
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Supabase] Realtime subscription active');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[Supabase] Realtime subscription error');
      } else if (status === 'TIMED_OUT') {
        console.error('[Supabase] Realtime subscription timed out');
      }
    });

  // Return unsubscribe function
  return () => {
    console.log('[Supabase] Unsubscribing from Realtime');
    supabase.removeChannel(channel);
  };
}
