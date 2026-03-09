import { useState, useMemo, useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { Venue } from '../types';
import './MapSearchBar.css';

interface MapSearchBarProps {
    venues: Venue[];
}

export default function MapSearchBar({ venues }: MapSearchBarProps) {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const map = useMap();
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Filter venues based on query
    const results = useMemo(() => {
        if (!query.trim()) return [];
        const lowerQuery = query.toLowerCase();
        return venues.filter(v => {
            const nameMatch = v['Venue name']?.toLowerCase().includes(lowerQuery);
            const addressMatch = v['Site address']?.toLowerCase().includes(lowerQuery);
            const quoteMatch = v['Quote No']?.toString().toLowerCase().includes(lowerQuery);
            return nameMatch || addressMatch || quoteMatch;
        }).slice(0, 8); // Limit to 8 results to avoid huge dropdowns
    }, [query, venues]);

    const handleSelect = (venue: Venue) => {
        setQuery('');
        setIsOpen(false);
        if (venue.lat !== null && venue.lng !== null) {
            map.flyTo([venue.lat, venue.lng], 16, { duration: 1.5 });
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Prevent map interactions when interacting with the search bar
    const preventMapEvents = (e: React.MouseEvent | React.TouchEvent | React.WheelEvent) => {
        e.stopPropagation();
    };

    return (
        <div
            ref={wrapperRef}
            className="map-search-bar"
            onPointerDown={preventMapEvents}
            onPointerUp={preventMapEvents}
            onPointerMove={preventMapEvents}
            onWheel={preventMapEvents}
        >
            <div className="search-input-wrapper">
                <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                    type="text"
                    placeholder="Search venues by address, name or quote number"
                    value={query}
                    onChange={e => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                />
                {query && (
                    <button className="clear-btn" onClick={() => { setQuery(''); setIsOpen(false); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <ul className="search-results">
                    {results.map((venue, idx) => (
                        <li key={`${venue['Venue name']}-${idx}`} onClick={() => handleSelect(venue)}>
                            <div className="result-name">{venue['Venue name']}</div>
                            <div className="result-meta">
                                <span className="result-address">{venue['Site address']}</span>
                                {venue['Quote No'] && <span className="result-quote">Quote #{venue['Quote No']}</span>}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {isOpen && query.trim() !== '' && results.length === 0 && (
                <div className="search-no-results">
                    No venues found.
                </div>
            )}
        </div>
    );
}
