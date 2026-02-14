'use client';

import { useState, useEffect } from 'react';
import { settingsStore } from '@/lib/store/settings-store';
import { useSubscriptionSync } from '@/lib/hooks/useSubscriptionSync';
import { startDataSync } from '@/lib/store/user-data-sync';
import { useSearchHistoryStore } from '@/lib/store/search-history-store';
import { useHistoryStore, usePremiumHistoryStore } from '@/lib/store/history-store';
import { useFavoritesStore, usePremiumFavoritesStore } from '@/lib/store/favorites-store';

/**
 * AuthGate - Replaces the old PasswordGate
 * Now auth is handled by middleware, this component:
 * 1. Fetches current user info and stores globally
 * 2. Syncs env subscriptions
 * 3. Loads user data from server into localStorage for Zustand stores
 * 4. Rehydrates Zustand stores after loading data
 */
export function PasswordGate({ children }: { children: React.ReactNode, hasEnvPassword?: boolean }) {
    useSubscriptionSync();

    const [ready, setReady] = useState(false);

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                // Fetch user info
                const meRes = await fetch('/api/auth/me');
                if (meRes.ok) {
                    const meData = await meRes.json();
                    if (typeof window !== 'undefined' && meData.user) {
                        (window as any).__KVIDEO_USER__ = meData.user;
                        (window as any).__KVIDEO_DISABLE_PREMIUM__ = meData.user.disablePremium;
                    }
                }

                // Fetch config and sync subscriptions
                const configRes = await fetch('/api/config');
                if (configRes.ok) {
                    const configData = await configRes.json();
                    if (configData.subscriptionSources) {
                        settingsStore.syncEnvSubscriptions(configData.subscriptionSources);
                    }
                }

                // Load user data from server into localStorage (for Zustand stores)
                const dataKeys = [
                    { key: 'settings', storageKey: 'kvideo-settings' },
                    { key: 'history', storageKey: 'kvideo-history-store' },
                    { key: 'favorites', storageKey: 'kvideo-favorites-store' },
                    { key: 'search-history', storageKey: 'kvideo-search-history' },
                    { key: 'premium-history', storageKey: 'kvideo-premium-history-store' },
                    { key: 'premium-favorites', storageKey: 'kvideo-premium-favorites-store' },
                ];

                for (const { key, storageKey } of dataKeys) {
                    try {
                        const res = await fetch(`/api/user/data?key=${key}`);
                        if (res.ok) {
                            const { data } = await res.json();
                            if (data && Object.keys(data).length > 0) {
                                localStorage.setItem(storageKey, JSON.stringify(data));
                            }
                        }
                    } catch {
                        // Individual key failure shouldn't block app
                    }
                }

                // Rehydrate all Zustand persist stores so they pick up
                // the server data we just wrote to localStorage
                try {
                    useSearchHistoryStore.persist.rehydrate();
                    useHistoryStore.persist.rehydrate();
                    usePremiumHistoryStore.persist.rehydrate();
                    useFavoritesStore.persist.rehydrate();
                    usePremiumFavoritesStore.persist.rehydrate();
                } catch {
                    // Rehydration failure shouldn't block app
                }
            } catch (e) {
                console.error('AuthGate init failed:', e);
            }

            // Start syncing localStorage writes to server
            startDataSync();

            if (mounted) setReady(true);
        };

        init();
        return () => { mounted = false; };
    }, []);

    if (!ready) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--bg-color)]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--accent-color)] border-t-transparent" />
            </div>
        );
    }

    return <>{children}</>;
}

