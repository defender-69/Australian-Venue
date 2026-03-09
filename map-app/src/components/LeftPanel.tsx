import { useRef } from 'react';
import type { Bundle, Venue, QuoteStatus, DateFilterPreset } from '../types';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const PIPELINE_CONFIG: Record<QuoteStatus, { label: string; color: string }> = {
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

function SortableBundleCard({
    bundle,
    bundleValue,
    formatCurrency,
    onOpenBundleTab,
    onBulkSelectFromMap,
}: {
    bundle: Bundle;
    bundleValue: number;
    formatCurrency: (amount: number) => string;
    onOpenBundleTab: (id: string) => void;
    onBulkSelectFromMap: (id: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bundle.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        borderLeftColor: bundle.color,
        cursor: isDragging ? 'grabbing' : 'pointer'
    };

    const discountedVal = bundleValue * (1 - bundle.discount / 100);

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="bundle-list-card"
            onClick={() => onOpenBundleTab(bundle.id)}
            role="button"
            tabIndex={0}
        >
            <div className="bundle-card-top">
                <span className="bundle-color-swatch" style={{ backgroundColor: bundle.color }} />
                <span className="bundle-card-name" style={{ flexGrow: 1, pointerEvents: 'none' }}>{bundle.name}</span>
                <span className="bundle-venue-badge">{bundle.venueNames.length}</span>
            </div>
            <div className="bundle-card-bottom">
                <span className="bundle-card-value">{formatCurrency(discountedVal)}</span>
                {bundle.discount > 0 && (
                    <span className="bundle-discount-tag">-{bundle.discount}%</span>
                )}
            </div>
            <button
                className="bundle-card-select-btn"
                onPointerDown={(e) => { e.stopPropagation(); }}
                onClick={(e) => {
                    e.stopPropagation();
                    onBulkSelectFromMap(bundle.id);
                }}
                title="Draw a rectangle on the map to bulk-add venues to this bundle"
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" style={{ strokeDasharray: '4 3' }} />
                </svg>
                Select from Map
            </button>
        </div>
    );
}

interface LeftPanelProps {
    venues: Venue[];
    bundles: Bundle[];
    activeTab: string;
    onOpenBundleTab: (bundleId: string) => void;
    onCreateBundle: () => void;
    onBulkSelectFromMap: (bundleId: string) => void;
    onReorderBundles: (newOrderIds: string[]) => void;
    onExportSession: () => void;
    onImportSession: (event: React.ChangeEvent<HTMLInputElement>) => void;
    statusFilter: Set<QuoteStatus>;
    onStatusFilterChange: (s: Set<QuoteStatus>) => void;
    quoteStatuses: Record<string, QuoteStatus>;
    dateFilterType: DateFilterPreset;
    onDateFilterTypeChange: (type: DateFilterPreset) => void;
    customDateRange: { from: string; to: string };
    onCustomDateRangeChange: (range: { from: string; to: string }) => void;
}

export default function LeftPanel({
    venues,
    bundles,
    activeTab,
    onOpenBundleTab,
    onCreateBundle,
    onBulkSelectFromMap,
    onReorderBundles,
    onExportSession,
    onImportSession,
    statusFilter,
    onStatusFilterChange,
    quoteStatuses,
    dateFilterType,
    onDateFilterTypeChange,
    customDateRange,
    onCustomDateRangeChange,
}: LeftPanelProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = bundles.findIndex(b => b.id === active.id);
            const newIndex = bundles.findIndex(b => b.id === over.id);
            const newOrder = arrayMove(bundles.map(b => b.id), oldIndex, newIndex);
            onReorderBundles(newOrder);
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);

    const totalQuotes = venues.filter(v => !v.is_hq).length;
    const totalValue = venues.filter(v => !v.is_hq).reduce((s, v) => s + (v['Sub Total'] || 0), 0);

    const assignedNames = new Set(bundles.flatMap(b => b.venueNames));
    const assignedCount = assignedNames.size;
    const unassignedCount = Math.max(0, totalQuotes - assignedCount);

    const bundleValue = (bundle: Bundle) =>
        venues
            .filter(v => bundle.venueNames.includes(v['Venue name']))
            .reduce((s, v) => s + (v['Sub Total'] || 0), 0);

    return (
        <aside className="left-panel">
            <div className="left-panel-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-panel)' }}>
                <div style={{ flexShrink: 0 }}>
                    <img src={`${import.meta.env.BASE_URL}defender-logo.png`} alt="Defender" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.2 }}>Defender / Australian Venue Co.</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Quote Bundle Manager</span>
                </div>
            </div>

            {/* KPI Dashboard */}
            <div className="kpi-section">
                <button
                    className="create-bundle-btn"
                    onClick={() => onOpenBundleTab('map')}
                    style={{
                        marginBottom: '16px',
                        marginTop: 0,
                        borderStyle: 'solid',
                        background: activeTab === 'map' ? 'var(--accent-light)' : 'var(--bg-surface)',
                        color: activeTab === 'map' ? 'var(--accent)' : 'var(--text-primary)',
                        borderColor: activeTab === 'map' ? 'var(--accent)' : 'var(--border)',
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                        <line x1="8" y1="2" x2="8" y2="18" />
                        <line x1="16" y1="6" x2="16" y2="22" />
                    </svg>
                    Map View
                </button>

                <div className="kpi-grid">
                    <div className="kpi-card" style={{ gridColumn: 'span 1' }}>
                        <span className="kpi-value">{totalQuotes}</span>
                        <span className="kpi-label">Total Quotes</span>
                    </div>
                    <div className="kpi-card kpi-highlight" style={{ gridColumn: 'span 1' }}>
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
                <div className="pipeline-summary">
                    {(Object.keys(PIPELINE_CONFIG) as QuoteStatus[]).map(status => {
                        const statusCount = venues.filter(v => !v.is_hq && (quoteStatuses[v['Venue name']] || 'draft') === status).length;
                        if (statusCount === 0) return null;
                        const cfg = PIPELINE_CONFIG[status];
                        return (
                            <div key={status} className="pipeline-item" style={{ borderLeftColor: cfg.color }}>
                                <span className="pipeline-label" style={{ color: cfg.color }}>{cfg.label}</span>
                                <span className="pipeline-count">{statusCount}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Status Filter */}
                <div className="status-filter-section" style={{ marginTop: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Filter Map By Status</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {(Object.keys(PIPELINE_CONFIG) as QuoteStatus[]).map(status => {
                            const cfg = PIPELINE_CONFIG[status];
                            const isSelected = statusFilter.has(status);
                            return (
                                <label key={status} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                            const next = new Set(statusFilter);
                                            if (e.target.checked) next.add(status);
                                            else next.delete(status);
                                            onStatusFilterChange(next);
                                        }}
                                        style={{ accentColor: cfg.color, cursor: 'pointer', width: '16px', height: '16px' }}
                                    />
                                    {cfg.label}
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* Date Filter */}
                <div className="date-filter-section" style={{ marginTop: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Filter Map By Date</div>
                    <select
                        value={dateFilterType}
                        onChange={(e) => onDateFilterTypeChange(e.target.value as DateFilterPreset)}
                        style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-panel)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            marginBottom: dateFilterType === 'custom' ? '8px' : '0'
                        }}
                    >
                        <option value="all">All Time</option>
                        <option value="last7days">Last 7 Days</option>
                        <option value="last30days">Last 30 Days</option>
                        <option value="thisMonth">This Month</option>
                        <option value="lastMonth">Last Month</option>
                        <option value="thisYear">This Year</option>
                        <option value="custom">Custom Range...</option>
                    </select>
                    {dateFilterType === 'custom' && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>From</label>
                                <input
                                    type="date"
                                    value={customDateRange.from}
                                    onChange={(e) => onCustomDateRangeChange({ ...customDateRange, from: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '6px',
                                        borderRadius: '4px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg-panel)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px'
                                    }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>To</label>
                                <input
                                    type="date"
                                    value={customDateRange.to}
                                    onChange={(e) => onCustomDateRangeChange({ ...customDateRange, to: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '6px',
                                        borderRadius: '4px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg-panel)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px'
                                    }}
                                />
                            </div>
                        </div>
                    )}
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
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={bundles.map(b => b.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {bundles.map(bundle => (
                                    <SortableBundleCard
                                        key={bundle.id}
                                        bundle={bundle}
                                        bundleValue={bundleValue(bundle)}
                                        formatCurrency={formatCurrency}
                                        onOpenBundleTab={onOpenBundleTab}
                                        onBulkSelectFromMap={onBulkSelectFromMap}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    </div>
                )}

                <button className="create-bundle-btn" onClick={onCreateBundle}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Create New Bundle
                </button>

                {/* Session Management */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button
                        className="create-bundle-btn"
                        onClick={onExportSession}
                        style={{ flex: 1, backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        title="Save all bundles to a file"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                            <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                        Save Session
                    </button>
                    <button
                        className="create-bundle-btn"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ flex: 1, backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        title="Load bundles from a file"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Load Session
                    </button>
                    <input
                        type="file"
                        accept=".json"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={onImportSession}
                    />
                </div>
            </div>
        </aside>
    );
}
