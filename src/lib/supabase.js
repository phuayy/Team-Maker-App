import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/**
 * Subscribe to real-time changes for a specific session.
 * Listens to Player table changes (INSERT, UPDATE, DELETE) filtered by sessionId.
 */
export function subscribeToSession(sessionId, onUpdate) {
    if (!supabase) {
        console.warn('Supabase not configured — real-time disabled');
        return { unsubscribe: () => { } };
    }

    const channel = supabase
        .channel(`session-${sessionId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'Player',
                filter: `sessionId=eq.${sessionId}`,
            },
            (payload) => {
                onUpdate(payload);
            }
        )
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'Team',
                filter: `sessionId=eq.${sessionId}`,
            },
            (payload) => {
                onUpdate(payload);
            }
        )
        .subscribe();

    return {
        unsubscribe: () => {
            supabase.removeChannel(channel);
        },
    };
}
