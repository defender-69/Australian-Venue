import type { Venue } from '../types';

interface SidebarProps {
    venues: Venue[];
    states: string[];
    selectedState: string;
    onStateChange: (state: string) => void;
}

export default function Sidebar({ venues, states, selectedState, onStateChange }: SidebarProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
    };

    const totalValue = venues.reduce((sum, v) => sum + (v['Sub Total'] || 0), 0);
    const quoteCount = venues.filter(v => !v.is_hq).length;

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
                    <span className="card-label">Total Quotes</span>
                    <span className="card-value">{quoteCount}</span>
                </div>
                <div className="summary-card highlight">
                    <span className="card-label">Total Value</span>
                    <span className="card-value">{formatCurrency(totalValue)}</span>
                </div>
            </div>

            <div className="venue-list-header">
                <h2>{selectedState === 'All' ? 'Showing All' : `Quotes in ${selectedState}`}</h2>
            </div>

            <div className="venue-list">
                {venues.map((venue, idx) => (
                    <div key={idx} className={`venue-card ${venue.is_hq ? 'hq-card' : ''}`}>
                        <div className="card-header">
                            <span className="venue-name">{venue['Venue name']}</span>
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
