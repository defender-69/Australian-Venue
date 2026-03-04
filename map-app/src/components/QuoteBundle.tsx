import { useMemo } from 'react';
import type { Venue } from '../types';

interface QuoteBundleProps {
    venues: Venue[];
    selectedVenues: Set<string>;
    onRemoveVenue: (venueName: string, selected: boolean) => void;
    discount: number;
    onDiscountChange: (discount: number) => void;
}

export default function QuoteBundle({ venues, selectedVenues, onRemoveVenue, discount, onDiscountChange }: QuoteBundleProps) {
    const selectedVenueList = useMemo(() => {
        return venues.filter((v) => selectedVenues.has(v['Venue name']));
    }, [venues, selectedVenues]);

    const originalTotal = useMemo(() => {
        return selectedVenueList.reduce((sum, v) => sum + (v['Sub Total'] || 0), 0);
    }, [selectedVenueList]);

    const discountAmount = (originalTotal * discount) / 100;
    const revisedTotal = originalTotal - discountAmount;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);
    };

    if (selectedVenueList.length === 0) {
        return (
            <div className="bundle-empty">
                <h2>No Quotes Selected</h2>
                <p>Go back to the Map View and select quotes to bundle them.</p>
            </div>
        );
    }

    return (
        <div className="bundle-container">
            <div className="bundle-header">
                <h2>Quote Bundle ({selectedVenueList.length} sites)</h2>
            </div>

            <div className="bundle-content">
                <div className="bundle-table-container">
                    <table className="bundle-table">
                        <thead>
                            <tr>
                                <th>Venue Name</th>
                                <th>Address</th>
                                <th>Quote No</th>
                                <th>Date</th>
                                <th className="text-right">Original Value</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedVenueList.map((venue) => (
                                <tr key={venue['Venue name']}>
                                    <td className="font-medium">{venue['Venue name']}</td>
                                    <td>{venue['Site address']}</td>
                                    <td>{venue['Quote No']}</td>
                                    <td>{venue['Date']}</td>
                                    <td className="text-right">{formatCurrency(venue['Sub Total'])}</td>
                                    <td className="text-center">
                                        <button
                                            className="remove-btn"
                                            onClick={() => onRemoveVenue(venue['Venue name'], false)}
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

                <div className="bundle-summary">
                    <div className="summary-row">
                        <span>Total Original Value:</span>
                        <span className="summary-value">{formatCurrency(originalTotal)}</span>
                    </div>

                    <div className="summary-row discount-row">
                        <label htmlFor="discount">Apply Discount (%):</label>
                        <input
                            id="discount"
                            type="number"
                            min="0"
                            max="100"
                            value={discount}
                            onChange={(e) => onDiscountChange(Number(e.target.value) || 0)}
                            className="discount-input"
                        />
                    </div>

                    <p className="discount-disclaimer">
                        Note: discount will apply to the total value of the quote, including Project Management, Loading and Freight
                    </p>

                    {discount > 0 && (
                        <div className="summary-row savings">
                            <span>Discount:</span>
                            <span className="summary-value">-{formatCurrency(discountAmount)}</span>
                        </div>
                    )}

                    <div className="summary-row total-row">
                        <span>Revised Total Value:</span>
                        <span className="summary-value revised">{formatCurrency(revisedTotal)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
