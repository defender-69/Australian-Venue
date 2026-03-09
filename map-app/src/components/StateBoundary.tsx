import { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface StateBoundaryProps {
    selectedState: string; // "All" or a state abbreviation like "VIC"
}

export default function StateBoundary({ selectedState }: StateBoundaryProps) {
    const map = useMap();
    const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);
    const layerRef = useRef<L.GeoJSON | null>(null);

    // Load GeoJSON once on mount
    useEffect(() => {
        fetch(`${import.meta.env.BASE_URL}au-states.json`)
            .then(res => res.json())
            .then((data: GeoJSON.FeatureCollection) => setGeoData(data))
            .catch(err => console.warn('Failed to load state boundaries:', err));
    }, []);

    // Draw / remove overlay when selectedState or data changes
    useEffect(() => {
        // Remove previous layer
        if (layerRef.current) {
            map.removeLayer(layerRef.current);
            layerRef.current = null;
        }

        // Only draw when a specific state is selected (not "All")
        if (!geoData || selectedState === 'All') return;

        const matching = geoData.features.filter(
            f => f.properties?.STATE_ABBR === selectedState
        );

        if (matching.length === 0) return;

        const filtered: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: matching,
        };

        layerRef.current = L.geoJSON(filtered, {
            style: {
                fillColor: '#2563EB',
                fillOpacity: 0.06,
                color: '#2563EB',
                opacity: 0.25,
                weight: 2,
            },
            interactive: false,
        }).addTo(map);

        // Send boundary layer to back so markers stay on top
        layerRef.current.bringToBack();

        return () => {
            if (layerRef.current) {
                map.removeLayer(layerRef.current);
                layerRef.current = null;
            }
        };
    }, [geoData, selectedState, map]);

    return null;
}
