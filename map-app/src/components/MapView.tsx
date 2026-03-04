import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Venue } from '../types';
import { useEffect } from 'react';

// Custom icons
const defaultIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const hqIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const greyIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

interface MapViewProps {
    venues: Venue[];
    selectedVenues: Set<string>;
    onVenueToggle: (venueName: string, selected: boolean) => void;
}

// Component to dynamically adjust map bounds when filtered
function MapBounds({ venues }: { venues: Venue[] }) {
    const map = useMap();

    useEffect(() => {
        if (venues.length === 0) return;

        const validVenues = venues.filter(v => v.lat !== null && v.lng !== null);
        if (validVenues.length === 0) return;

        const bounds = L.latLngBounds(validVenues.map(v => [v.lat!, v.lng!]));
        // Add padding so markers aren't right on the edge
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }, [venues, map]);

    return null;
}

export default function MapView({ venues, selectedVenues, onVenueToggle }: MapViewProps) {
    // Center roughly on Australia
    const center: [number, number] = [-25.274398, 133.775136];

    return (
        <div className="map-wrapper">
            <MapContainer center={center} zoom={4} scrollWheelZoom={true} className="leaflet-map">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                <MapBounds venues={venues} />

                {venues.map((venue, idx) => {
                    if (venue.lat === null || venue.lng === null) return null;

                    return (
                        <Marker
                            key={`${venue['Venue name']}-${idx}`}
                            position={[venue.lat, venue.lng]}
                            icon={venue.is_hq ? hqIcon : (selectedVenues.has(venue['Venue name']) ? defaultIcon : greyIcon)}
                            zIndexOffset={venue.is_hq ? 1000 : (selectedVenues.has(venue['Venue name']) ? 500 : 0)}
                        >
                            <Popup className="custom-popup">
                                <div className="popup-content">
                                    <h3 className="popup-title" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                            {venue.is_hq && <span className="hq-badge">HQ</span>}
                                            <span>{venue['Venue name']}</span>
                                        </div>
                                        {!venue.is_hq && (
                                            <input
                                                type="checkbox"
                                                checked={selectedVenues.has(venue['Venue name'])}
                                                onChange={(e) => onVenueToggle(venue['Venue name'], e.target.checked)}
                                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-primary)', marginTop: '4px' }}
                                                title="Select venue"
                                            />
                                        )}
                                    </h3>
                                    <p className="popup-address"><i className="icon-location"></i> {venue['Site address']}</p>

                                    {!venue.is_hq && (
                                        <>
                                            <div className="popup-meta">
                                                <span className="quote-no">Quote #{venue['Quote No']}</span>
                                                <span className="quote-date">{venue['Date']}</span>
                                            </div>

                                            <div className="popup-value">
                                                <span className="value-label">Sub Total:</span>
                                                <span className="value-amount">
                                                    {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(venue['Sub Total'])}
                                                </span>
                                            </div>

                                            {venue['Scope brief'] && (
                                                <div className="popup-scope">
                                                    <span className="scope-label">Scope:</span> {venue['Scope brief']}
                                                </div>
                                            )}

                                            {venue.pdf_filename && (
                                                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                                                    <a
                                                        href={`${import.meta.env.BASE_URL}quotes/${encodeURIComponent(venue.pdf_filename)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px',
                                                            backgroundColor: 'var(--accent-primary, #007bff)',
                                                            color: 'white',
                                                            padding: '8px 12px',
                                                            borderRadius: '6px',
                                                            textDecoration: 'none',
                                                            fontWeight: '500',
                                                            fontSize: '13px',
                                                            transition: 'opacity 0.2s',
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                        }}
                                                        onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                                                        onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                            <polyline points="14 2 14 8 20 8"></polyline>
                                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                                            <polyline points="10 9 9 9 8 9"></polyline>
                                                        </svg>
                                                        View Quote PDF
                                                    </a>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
