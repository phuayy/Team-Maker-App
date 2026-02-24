import { useEffect, useCallback, useRef } from 'react';
import { subscribeToSession } from '@/lib/supabase';

/**
 * React hook for real-time session updates via Supabase Realtime.
 *
 * @param {string} sessionId - Session to subscribe to
 * @param {Function} onUpdate - Callback when data changes (triggers refetch)
 */
export function useRealtimeSession(sessionId, onUpdate) {
    const onUpdateRef = useRef(onUpdate);
    onUpdateRef.current = onUpdate;

    useEffect(() => {
        if (!sessionId) return;

        const sub = subscribeToSession(sessionId, () => {
            onUpdateRef.current?.();
        });

        return () => {
            sub.unsubscribe();
        };
    }, [sessionId]);
}
