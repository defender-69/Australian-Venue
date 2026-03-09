import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import type { Bundle, BundleStatus } from './types';

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
            notes: '',
            status: 'draft',
        };
        setBundles(prev => [...prev, newBundle]);
        return newBundle.id;
    }, []);

    const deleteBundle = useCallback((id: string) => {
        setBundles(prev => {
            const bundle = prev.find(b => b.id === id);
            if (bundle) toast.success(`Deleted bundle "${bundle.name}"`, { id: `del-${id}` });
            return prev.filter(b => b.id !== id);
        });
    }, []);

    const renameBundle = useCallback((id: string, name: string) => {
        setBundles(prev => prev.map(b => b.id === id ? { ...b, name } : b));
    }, []);

    const loadBundles = useCallback((newBundles: Bundle[]) => {
        setBundles(newBundles);
    }, []);

    const setDiscount = useCallback((id: string, discount: number) => {
        setBundles(prev => prev.map(b => b.id === id ? { ...b, discount } : b));
    }, []);

    // Add venue to a bundle — removes from any previous bundle first (exclusive)
    const addVenueToBundle = useCallback((venueName: string, bundleId: string) => {
        setBundles(prev => {
            const targetBundle = prev.find(b => b.id === bundleId);
            if (targetBundle && !targetBundle.venueNames.includes(venueName)) {
                toast.success(`Added ${venueName} to "${targetBundle.name}"`, { id: `add-${venueName}-${bundleId}` });
            }
            return prev.map(b => {
                if (b.id === bundleId) {
                    // Add to target (avoid duplicates)
                    if (b.venueNames.includes(venueName)) return b;
                    return { ...b, venueNames: [...b.venueNames, venueName] };
                } else {
                    // Remove from any other bundle
                    return { ...b, venueNames: b.venueNames.filter(v => v !== venueName) };
                }
            });
        });
    }, []);

    // Remove venue from whichever bundle it's in
    const removeVenueFromBundle = useCallback((venueName: string) => {
        setBundles(prev => {
            const wasInBundle = prev.some(b => b.venueNames.includes(venueName));
            if (wasInBundle) toast.success(`Removed ${venueName} from bundle`, { id: `rm-${venueName}` });
            return prev.map(b => ({
                ...b,
                venueNames: b.venueNames.filter(v => v !== venueName),
            }));
        });
    }, []);

    // Set notes for a bundle
    const setBundleNotes = useCallback((id: string, notes: string) => {
        setBundles(prev => prev.map(b => b.id === id ? { ...b, notes } : b));
    }, []);

    // Set pipeline status for a bundle
    const setBundleStatus = useCallback((id: string, status: BundleStatus) => {
        setBundles(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    }, []);

    // Reorder venues within a bundle
    const reorderVenuesInBundle = useCallback((id: string, venueNames: string[]) => {
        setBundles(prev => prev.map(b => b.id === id ? { ...b, venueNames } : b));
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
        loadBundles,
        setDiscount,
        addVenueToBundle,
        removeVenueFromBundle,
        setBundleNotes,
        setBundleStatus,
        reorderVenuesInBundle,
        getBundleForVenue,
    };
}
