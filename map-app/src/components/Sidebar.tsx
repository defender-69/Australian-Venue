import type { Venue } from '../types';

interface SidebarProps {
    venues: Venue[];
    states: string[];
    selectedState: string;
    onStateChange: (state: string) => void;
    selectedVenues: Set<string>;
    onVenueToggle: (venueName: string, selected: boolean) => void;
    onToggleAll: (selectAll: boolean) => void;
}

export default function Sidebar({
    venues, states, selectedState, onStateChange,
    selectedVenues, onVenueToggle, onToggleAll
}: SidebarProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
    };

    const activeSidebarVenues = venues.filter(v => v.is_hq || selectedVenues.has(v['Venue name']));
    const totalValue = activeSidebarVenues.reduce((sum, v) => sum + (v['Sub Total'] || 0), 0);
    const quoteCount = activeSidebarVenues.filter(v => !v.is_hq).length;

    const hasFilteredVenues = venues.filter(v => !v.is_hq).length > 0;
    const allFilteredAreSelected = hasFilteredVenues &&
        venues.filter(v => !v.is_hq).every(v => selectedVenues.has(v['Venue name']));

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h1>Venue Quotes</h1>
                <p className="subtitle">Visualizing {quoteCount} site scopes</p>
            </div>

            <div className="filter-section">
                <label htmlFor="state-filter">Filter by State</label>
                <div className="select-wrapper">
                    <select
                        id="state-filter"
                        value={selectedState}
                        onChange={(e) => onStateChange(e.target.value)}
                    >
                        {states.map(state => (
                            <option key={state} value={state}>{state === 'All' ? 'All States' : state}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="summary-cards">
                <div className="summary-card">
                    <span className="card-label">Selected Quotes</span>
                    <span className="card-value">{quoteCount}</span>
                </div>
                <div className="summary-card highlight">
                    <span className="card-label">Total Value</span>
                    <span className="card-value">{formatCurrency(totalValue)}</span>
                </div>
            </div>

            <div className="venue-list-header">
                <h2>{selectedState === 'All' ? 'Showing All' : `Quotes in ${selectedState}`}</h2>
                {hasFilteredVenues && (
                    <label className="select-all-label">
                        <input
                            type="checkbox"
                            checked={allFilteredAreSelected}
                            onChange={(e) => onToggleAll(e.target.checked)}
                        />
                        Select All
                    </label>
                )}
            </div>

            <div className="venue-list">
                {venues.map((venue, idx) => (
                    <div
                        key={`${venue['Venue name']}-${idx}`}
                        className={`venue-card ${venue.is_hq ? 'hq-card' : ''}`}
                        onClick={() => {
                            if (!venue.is_hq) {
                                onVenueToggle(venue['Venue name'], !selectedVenues.has(venue['Venue name']));
                            }
                        }}
                    >
                        <div className="card-header" onClick={(e) => e.stopPropagation()}>
                            <label className="venue-checkbox-label" style={{ width: venue.is_hq ? 'auto' : '100%' }}>
                                {!venue.is_hq && (
                                    <input
                                        type="checkbox"
                                        checked={selectedVenues.has(venue['Venue name'])}
                                        onChange={(e) => onVenueToggle(venue['Venue name'], e.target.checked)}
                                    />
                                )}
                                <span className="venue-name">{venue['Venue name']}</span>
                            </label>
                            {venue.is_hq && <span className="hq-badge">HQ</span>}
                        </div>
                        <p className="venue-address">{venue['Site address']}</p>

                        {!venue.is_hq && (
                            <div className="card-footer">
                                <span className="quote-id">#{venue['Quote No']}</span>
                                <span className="quote-value">{formatCurrency(venue['Sub Total'])}</span>
                            </div>
                        )}
                    </div>
                ))}
                {venues.length === 0 && (
                    <div className="empty-state">No venues found for the selected filter.</div>
                )}
            </div>
        </aside>
    );
}
