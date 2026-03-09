import type { Bundle, Venue, BundleStatus } from '../types';

const PIPELINE_CONFIG: Record<BundleStatus, { label: string; color: string }> = {
    draft: { label: 'Draft', color: '#94A3B8' },
    submitted: { label: 'Submitted', color: '#3B82F6' },
    won: { label: 'Won', color: '#22C55E' },
    lost: { label: 'Lost', color: '#EF4444' },
};

export const BUNDLE_COLORS = [
    '#E74C3C', // Red
    '#E67E22', // Orange
    '#F1C40F', // Yellow
    '#2ECC71', // Green
    '#1ABC9C', // Teal
    '#3498DB', // Blue
    '#9B59B6', // Purple
    '#E91E63', // Pink
    '#795548', // Brown
    '#607D8B', // Blue Grey
    '#FF5722', // Deep Orange
    '#00BCD4', // Cyan
];

interface LeftPanelProps {
    venues: Venue[];
    bundles: Bundle[];
    selectedState: string;
    states: string[];
    onStateChange: (state: string) => void;
    onOpenBundleTab: (bundleId: string) => void;
    onCreateBundle: () => void;
}

export default function LeftPanel({
    venues,
    bundles,
    selectedState,
    states,
    onStateChange,
    onOpenBundleTab,
    onCreateBundle,
}: LeftPanelProps) {
    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);

    const totalQuotes = venues.filter(v => !v.is_hq).length;
    const totalValue = venues.filter(v => !v.is_hq).reduce((s, v) => s + (v['Sub Total'] || 0), 0);

    const assignedNames = new Set(bundles.flatMap(b => b.venueNames));
    const assignedCount = assignedNames.size;
    const unassignedCount = totalQuotes - assignedCount;

    const bundleValue = (bundle: Bundle) =>
        venues
            .filter(v => bundle.venueNames.includes(v['Venue name']))
            .reduce((s, v) => s + (v['Sub Total'] || 0), 0);

    return (
        <aside className="left-panel">
            <div className="left-panel-header">
                <div className="app-logo">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                    </svg>
                </div>
                <div>
                    <h1 className="panel-title">Venue Quoter</h1>
                    <p className="panel-subtitle">Quote Bundle Manager</p>
                </div>
            </div>

            {/* KPI Dashboard */}
            <div className="kpi-section">
                <div className="kpi-grid">
                    <div className="kpi-card">
                        <span className="kpi-value">{totalQuotes}</span>
                        <span className="kpi-label">Total Quotes</span>
                    </div>
                    <div className="kpi-card kpi-highlight">
                        <span className="kpi-value">{formatCurrency(totalValue)}</span>
                        <span className="kpi-label">Portfolio Value</span>
                    </div>
                    <div className="kpi-card kpi-assigned">
                        <span className="kpi-value">{assignedCount}</span>
                        <span className="kpi-label">In Bundles</span>
                    </div>
                    <div className="kpi-card kpi-unassigned">
                        <span className="kpi-value">{unassignedCount}</span>
                        <span className="kpi-label">Unassigned</span>
                    </div>
                </div>
                {/* Pipeline summary */}
                {bundles.length > 0 && (
                    <div className="pipeline-summary">
                        {(Object.keys(PIPELINE_CONFIG) as BundleStatus[]).map(status => {
                            const statusBundles = bundles.filter(b => (b.status || 'draft') === status);
                            if (statusBundles.length === 0) return null;
                            const cfg = PIPELINE_CONFIG[status];
                            return (
                                <div key={status} className="pipeline-item" style={{ borderLeftColor: cfg.color }}>
                                    <span className="pipeline-label" style={{ color: cfg.color }}>{cfg.label}</span>
                                    <span className="pipeline-count">{statusBundles.length}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* State Filter */}
            <div className="panel-filter-section">
                <label htmlFor="state-filter-panel" className="filter-label">Filter Map by State</label>
                <div className="select-wrapper">
                    <select
                        id="state-filter-panel"
                        value={selectedState}
                        onChange={e => onStateChange(e.target.value)}
                    >
                        {states.map(state => (
                            <option key={state} value={state}>{state === 'All' ? 'All States' : state}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Bundle List */}
            <div className="bundle-section">
                <div className="bundle-section-header">
                    <h2 className="section-title">Quote Bundles</h2>
                    <span className="bundle-count-badge">{bundles.length}</span>
                </div>

                {bundles.length === 0 ? (
                    <div className="bundles-empty">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }}>
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </svg>
                        <p>No bundles yet.<br />Create one to start grouping quotes.</p>
                    </div>
                ) : (
                    <div className="bundle-list">
                        {bundles.map(bundle => {
                            const val = bundleValue(bundle);
                            const discountedVal = val * (1 - bundle.discount / 100);
                            return (
                                <button
                                    key={bundle.id}
                                    className="bundle-list-card"
                                    onClick={() => onOpenBundleTab(bundle.id)}
                                    style={{ borderLeftColor: bundle.color }}
                                >
                                    <div className="bundle-card-top">
                                        <span
                                            className="bundle-color-swatch"
                                            style={{ backgroundColor: bundle.color }}
                                        />
                                        <span className="bundle-card-name">{bundle.name}</span>
                                        <span className="bundle-venue-badge">{bundle.venueNames.length}</span>
                                        <span
                                            className="bundle-card-status"
                                            style={{ backgroundColor: PIPELINE_CONFIG[bundle.status || 'draft'].color + '20', color: PIPELINE_CONFIG[bundle.status || 'draft'].color }}
                                        >
                                            {PIPELINE_CONFIG[bundle.status || 'draft'].label}
                                        </span>
                                    </div>
                                    <div className="bundle-card-bottom">
                                        <span className="bundle-card-value">{formatCurrency(discountedVal)}</span>
                                        {bundle.discount > 0 && (
                                            <span className="bundle-discount-tag">-{bundle.discount}%</span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                <button className="create-bundle-btn" onClick={onCreateBundle}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Create New Bundle
                </button>
            </div>
        </aside>
    );
}
