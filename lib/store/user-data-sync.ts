/**
 * User Data Sync Module
 * Syncs Zustand localStorage state back to server on changes
 */

const SYNC_DEBOUNCE_MS = 2000;
const syncTimers: Record<string, ReturnType<typeof setTimeout>> = {};

/**
 * Debounced save of localStorage data to server
 */
export function syncToServer(storageKey: string, dataKey: string) {
    if (typeof window === 'undefined') return;

    // Clear previous timer
    if (syncTimers[dataKey]) {
        clearTimeout(syncTimers[dataKey]);
    }

    syncTimers[dataKey] = setTimeout(async () => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (!raw) return;

            const value = JSON.parse(raw);

            await fetch('/api/user/data', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: dataKey, value }),
            });
        } catch (e) {
            console.error(`Failed to sync ${dataKey} to server:`, e);
        }
    }, SYNC_DEBOUNCE_MS);
}

// Mapping of localStorage keys to server data keys
const STORAGE_MAP: Record<string, string> = {
    'kvideo-settings': 'settings',
    'kvideo-history-store': 'history',
    'kvideo-favorites-store': 'favorites',
    'kvideo-search-history': 'search-history',
    'kvideo-premium-history-store': 'premium-history',
    'kvideo-premium-favorites-store': 'premium-favorites',
};

/**
 * Listen for localStorage changes and sync to server
 * Call this once in the app root
 */
export function startDataSync() {
    if (typeof window === 'undefined') return;

    // Override localStorage.setItem to intercept writes
    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (key: string, value: string) => {
        originalSetItem(key, value);
        const dataKey = STORAGE_MAP[key];
        if (dataKey) {
            syncToServer(key, dataKey);
        }
    };
}
