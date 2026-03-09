import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import StateBoundary from './StateBoundary';
import BundleLegend from './BundleLegend';
import type { Venue, Bundle } from '../types';
import { useEffect, useMemo, useState, useCallback } from 'react';

// HQ icon (red)
const hqIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// Grey icon for unassigned venues
const greyIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// Generate a coloured SVG pin icon from a hex colour
function createColorIcon(color: string) {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 21.9 12.5 41 12.5 41C12.5 41 25 21.9 25 12.5C25 5.6 19.4 0 12.5 0Z"
            fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="12.5" cy="12.5" r="5" fill="white" opacity="0.85"/>
    </svg>`;
    return L.divIcon({
        html: svg,
        className: '',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
    });
}

interface MapViewProps {
    venues: Venue[];
    bundles: Bundle[];
    selectedState: string;
    getBundleForVenue: (venueName: string) => Bundle | null;
    addVenueToBundle: (venueName: string, bundleId: string) => void;
    removeVenueFromBundle: (venueName: string) => void;
}

function MapBounds({ venues }: { venues: Venue[] }) {
    const map = useMap();
    useEffect(() => {
        if (venues.length === 0) return;
        const valid = venues.filter(v => v.lat !== null && v.lng !== null);
        if (valid.length === 0) return;
        const bounds = L.latLngBounds(valid.map(v => [v.lat!, v.lng!]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }, [venues, map]);
    return null;
}

export default function MapView({ venues, bundles, selectedState, getBundleForVenue, addVenueToBundle, removeVenueFromBundle }: MapViewProps) {
    const center: [number, number] = [-25.274398, 133.775136];
    const formatCurrency = (v: number) =>
        new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(v);

    // Separate HQ from regular venues so HQ stays outside cluster group
    const hqVenues = useMemo(() => venues.filter(v => v.is_hq), [venues]);
    const regularVenues = useMemo(() => venues.filter(v => !v.is_hq), [venues]);

    // Bundle legend toggle visibility
    const [hiddenBundleIds, setHiddenBundleIds] = useState<Set<string>>(new Set());
    const handleToggle = useCallback((bundleId: string) => {
        setHiddenBundleIds(prev => {
            const next = new Set(prev);
            if (next.has(bundleId)) next.delete(bundleId);
            else next.add(bundleId);
            return next;
        });
    }, []);

    // Filter venues based on legend visibility toggles
    const visibleVenues = useMemo(() => {
        return regularVenues.filter(venue => {
            const bundle = getBundleForVenue(venue['Venue name']);
            if (bundle) {
                return !hiddenBundleIds.has(bundle.id);
            }
            // Unassigned venues
            return !hiddenBundleIds.has('__unassigned__');
        });
    }, [regularVenues, hiddenBundleIds, getBundleForVenue]);

    return (
        <div className="map-wrapper">
            <MapContainer center={center} zoom={4} scrollWheelZoom={true} className="leaflet-map">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <MapBounds venues={venues} />
                <StateBoundary selectedState={selectedState} />

                {/* HQ markers — always visible, never clustered */}
                {hqVenues.map((venue, idx) => {
                    if (venue.lat === null || venue.lng === null) return null;
                    return (
                        <Marker
                            key={`hq-${venue['Venue name']}-${idx}`}
                            position={[venue.lat, venue.lng]}
                            icon={hqIcon}
                            zIndexOffset={1000}
                        >
                            <Popup className="custom-popup" minWidth={260}>
                                <div className="popup-content">
                                    <h3 className="popup-title">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="hq-badge">HQ</span>
                                            <span>{venue['Venue name']}</span>
                                        </div>
                                    </h3>
                                    <p className="popup-address">
                                        <i className="icon-location" /> {venue['Site address']}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Clustered venue markers */}
                <MarkerClusterGroup
                    showCoverageOnHover={false}
                    maxClusterRadius={50}
                    chunkedLoading
                >
                    {visibleVenues.map((venue, idx) => {
                        if (venue.lat === null || venue.lng === null) return null;

                        const bundle = getBundleForVenue(venue['Venue name']);
                        const icon = bundle
                            ? createColorIcon(bundle.color)
                            : greyIcon;

                        return (
                            <Marker
                                key={`${venue['Venue name']}-${idx}`}
                                position={[venue.lat, venue.lng]}
                                icon={icon}
                                zIndexOffset={bundle ? 500 : 0}
                            >
                                <Popup className="custom-popup" minWidth={260}>
                                    <div className="popup-content">
                                        <h3 className="popup-title">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {bundle && (
                                                    <span
                                                        className="popup-bundle-dot"
                                                        style={{ backgroundColor: bundle.color }}
                                                        title={`Bundle: ${bundle.name}`}
                                                    />
                                                )}
                                                <span>{venue['Venue name']}</span>
                                            </div>
                                        </h3>

                                        <p className="popup-address">
                                            <i className="icon-location" /> {venue['Site address']}
                                        </p>

                                        <div className="popup-meta">
                                            <span className="quote-no">Quote #{venue['Quote No']}</span>
                                            <span className="quote-date">{venue['Date']}</span>
                                        </div>

                                        <div className="popup-value">
                                            <span className="value-label">Sub Total:</span>
                                            <span className="value-amount">{formatCurrency(venue['Sub Total'])}</span>
                                        </div>

                                        {venue['Scope brief'] && (
                                            <div className="popup-scope">
                                                <span className="scope-label">Scope:</span> {venue['Scope brief']}
                                            </div>
                                        )}

                                        {/* Bundle assignment dropdown */}
                                        <div className="popup-bundle-section">
                                            {bundle ? (
                                                <div className="popup-bundle-assigned">
                                                    <span
                                                        className="popup-bundle-chip"
                                                        style={{ backgroundColor: bundle.color + '22', borderColor: bundle.color, color: bundle.color }}
                                                    >
                                                        <span className="swatch-xs" style={{ backgroundColor: bundle.color }} />
                                                        {bundle.name}
                                                    </span>
                                                    <div className="popup-bundle-actions">
                                                        {bundles.length > 1 && (
                                                            <select
                                                                className="popup-bundle-select"
                                                                value={bundle.id}
                                                                onChange={e => addVenueToBundle(venue['Venue name'], e.target.value)}
                                                            >
                                                                {bundles.map(b => (
                                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                        <button
                                                            className="popup-remove-btn"
                                                            onClick={() => removeVenueFromBundle(venue['Venue name'])}
                                                        >
                                                            Remove from bundle
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="popup-bundle-unassigned">
                                                    {bundles.length > 0 ? (
                                                        <>
                                                            <label className="popup-bundle-label">Add to bundle:</label>
                                                            <select
                                                                className="popup-bundle-select"
                                                                defaultValue=""
                                                                onChange={e => {
                                                                    if (e.target.value) addVenueToBundle(venue['Venue name'], e.target.value);
                                                                }}
                                                            >
                                                                <option value="" disabled>Select a bundle…</option>
                                                                {bundles.map(b => (
                                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                                ))}
                                                            </select>
                                                        </>
                                                    ) : (
                                                        <p className="popup-no-bundles">No bundles yet — create one in the left panel.</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {venue.pdf_filename && (
                                            <div style={{ marginTop: '12px', textAlign: 'center' }}>
                                                <a
                                                    href={`${import.meta.env.BASE_URL}quotes/${encodeURIComponent(venue.pdf_filename)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="popup-pdf-btn"
                                                >
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                        <polyline points="14 2 14 8 20 8" />
                                                        <line x1="16" y1="13" x2="8" y2="13" />
                                                        <line x1="16" y1="17" x2="8" y2="17" />
                                                    </svg>
                                                    View Quote PDF
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MarkerClusterGroup>

                {/* Bundle legend */}
                <BundleLegend
                    bundles={bundles}
                    hiddenBundleIds={hiddenBundleIds}
                    onToggle={handleToggle}
                />
            </MapContainer>
        </div>
    );
}
