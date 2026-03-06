import { useMemo } from 'react';
import type { Venue, Bundle } from '../types';

interface BundleViewProps {
    bundle: Bundle;
    venues: Venue[];
    onDiscountChange: (bundleId: string, discount: number) => void;
    onRemoveVenue: (venueName: string) => void;
    onDeleteBundle: (bundleId: string) => void;
    onRenameBundle: (bundleId: string, name: string) => void;
}

export default function BundleView({
    bundle,
    venues,
    onDiscountChange,
    onRemoveVenue,
    onDeleteBundle,
    onRenameBundle,
}: BundleViewProps) {
    const bundleVenues = useMemo(() =>
        venues.filter(v => bundle.venueNames.includes(v['Venue name'])),
        [venues, bundle.venueNames]
    );

    const originalTotal = useMemo(() =>
        bundleVenues.reduce((sum, v) => sum + (v['Sub Total'] || 0), 0),
        [bundleVenues]
    );

    const discountAmount = (originalTotal * bundle.discount) / 100;
    const revisedTotal = originalTotal - discountAmount;

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

    const handleDelete = () => {
        if (window.confirm(`Delete bundle "${bundle.name}"? All venues will become unassigned.`)) {
            onDeleteBundle(bundle.id);
        }
    };

    if (bundleVenues.length === 0) {
        return (
            <div className="bundle-empty">
                <div className="bundle-empty-banner" style={{ borderColor: bundle.color, backgroundColor: bundle.color + '18' }}>
                    <span className="bundle-color-indicator" style={{ backgroundColor: bundle.color }} />
                    <h2>{bundle.name}</h2>
                </div>
                <div className="bundle-empty-body">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </svg>
                    <p>No venues assigned to this bundle yet.</p>
                    <p className="hint">Click a marker on the map and use the <strong>Add to Bundle</strong> dropdown to assign venues here.</p>
                    <button className="delete-bundle-btn ghost" onClick={handleDelete}>Delete this bundle</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bundle-container">
            {/* Bundle header bar */}
            <div className="bundle-header-bar" style={{ borderLeftColor: bundle.color }}>
                <div className="bundle-header-left">
                    <span className="bundle-color-indicator" style={{ backgroundColor: bundle.color }} />
                    <input
                        className="bundle-name-input"
                        value={bundle.name}
                        onChange={e => onRenameBundle(bundle.id, e.target.value)}
                        maxLength={40}
                        aria-label="Bundle name"
                    />
                    <span className="bundle-venue-count">{bundleVenues.length} sites</span>
                </div>
                <button className="delete-bundle-btn" onClick={handleDelete} title="Delete bundle">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                    </svg>
                    Delete Bundle
                </button>
            </div>

            <div className="bundle-content">
                {/* Venue table */}
                <div className="bundle-table-container">
                    <table className="bundle-table">
                        <thead>
                            <tr>
                                <th>Venue Name</th>
                                <th>Address</th>
                                <th>Quote No</th>
                                <th>Date</th>
                                <th className="text-right">Original Value</th>
                                <th>Remove</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bundleVenues.map(venue => (
                                <tr key={venue['Venue name']}>
                                    <td className="font-medium">{venue['Venue name']}</td>
                                    <td>{venue['Site address']}</td>
                                    <td>{venue['Quote No']}</td>
                                    <td>{venue['Date']}</td>
                                    <td className="text-right">{formatCurrency(venue['Sub Total'])}</td>
                                    <td className="text-center">
                                        <button
                                            className="remove-btn"
                                            onClick={() => onRemoveVenue(venue['Venue name'])}
                                            title="Remove from bundle"
                                        >
                                            ×
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Summary panel */}
                <div className="bundle-summary" style={{ borderTopColor: bundle.color + '55' }}>
                    <div className="summary-row">
                        <span>Total Original Value:</span>
                        <span className="summary-value">{formatCurrency(originalTotal)}</span>
                    </div>

                    <div className="summary-row discount-row">
                        <label htmlFor={`discount-${bundle.id}`}>Apply Discount (%):</label>
                        <input
                            id={`discount-${bundle.id}`}
                            type="number"
                            min="0"
                            max="100"
                            value={bundle.discount}
                            onChange={e => onDiscountChange(bundle.id, Number(e.target.value) || 0)}
                            className="discount-input"
                        />
                    </div>

                    <p className="discount-disclaimer">
                        Discount applies to the total value including Project Management, Loading and Freight.
                    </p>

                    {bundle.discount > 0 && (
                        <div className="summary-row savings">
                            <span>Discount ({bundle.discount}%):</span>
                            <span className="summary-value">-{formatCurrency(discountAmount)}</span>
                        </div>
                    )}

                    <div className="summary-row total-row">
                        <span>Revised Total Value:</span>
                        <span className="summary-value revised" style={{ color: bundle.color }}>
                            {formatCurrency(revisedTotal)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
