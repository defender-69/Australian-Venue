import { useState, useEffect, useCallback } from 'react';
import type { Bundle } from './types';

const STORAGE_KEY = 'venue-bundles';

function generateId(): string {
    return `bundle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useBundles() {
    const [bundles, setBundles] = useState<Bundle[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    // Persist to localStorage whenever bundles change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bundles));
    }, [bundles]);

    const createBundle = useCallback((name: string, color: string) => {
        const newBundle: Bundle = {
            id: generateId(),
            name,
            color,
            discount: 0,
            venueNames: [],
        };
        setBundles(prev => [...prev, newBundle]);
        return newBundle.id;
    }, []);

    const deleteBundle = useCallback((id: string) => {
        setBundles(prev => prev.filter(b => b.id !== id));
    }, []);

    const renameBundle = useCallback((id: string, name: string) => {
        setBundles(prev => prev.map(b => b.id === id ? { ...b, name } : b));
    }, []);

    const setDiscount = useCallback((id: string, discount: number) => {
        setBundles(prev => prev.map(b => b.id === id ? { ...b, discount } : b));
    }, []);

    // Add venue to a bundle — removes from any previous bundle first (exclusive)
    const addVenueToBundle = useCallback((venueName: string, bundleId: string) => {
        setBundles(prev => prev.map(b => {
            if (b.id === bundleId) {
                // Add to target (avoid duplicates)
                if (b.venueNames.includes(venueName)) return b;
                return { ...b, venueNames: [...b.venueNames, venueName] };
            } else {
                // Remove from any other bundle
                return { ...b, venueNames: b.venueNames.filter(v => v !== venueName) };
            }
        }));
    }, []);

    // Remove venue from whichever bundle it's in
    const removeVenueFromBundle = useCallback((venueName: string) => {
        setBundles(prev => prev.map(b => ({
            ...b,
            venueNames: b.venueNames.filter(v => v !== venueName),
        })));
    }, []);

    // Get the bundle a venue belongs to (or null if unassigned)
    const getBundleForVenue = useCallback((venueName: string): Bundle | null => {
        return bundles.find(b => b.venueNames.includes(venueName)) ?? null;
    }, [bundles]);

    return {
        bundles,
        createBundle,
        deleteBundle,
        renameBundle,
        setDiscount,
        addVenueToBundle,
        removeVenueFromBundle,
        getBundleForVenue,
    };
}
