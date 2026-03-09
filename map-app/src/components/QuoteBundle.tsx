import { useMemo, useState, useRef } from 'react';
import type { Venue, Bundle, BundleStatus } from '../types';
import { exportCSV, exportPDF } from '../exportBundle';
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

const STATUS_CONFIG: Record<BundleStatus, { label: string; color: string; icon: string }> = {
    draft: { label: 'Draft', color: '#94A3B8', icon: '✎' },
    submitted: { label: 'Submitted', color: '#3B82F6', icon: '→' },
    won: { label: 'Won', color: '#22C55E', icon: '✓' },
    lost: { label: 'Lost', color: '#EF4444', icon: '✗' },
};

interface BundleViewProps {
    bundle: Bundle;
    venues: Venue[];
    onDiscountChange: (bundleId: string, discount: number) => void;
    onRemoveVenue: (venueName: string) => void;
    onDeleteBundle: (bundleId: string) => void;
    onRenameBundle: (bundleId: string, name: string) => void;
    onNotesChange: (bundleId: string, notes: string) => void;
    onStatusChange: (bundleId: string, status: BundleStatus) => void;
    onReorderVenues: (bundleId: string, venueNames: string[]) => void;
}

// ── Sortable Row Component ──
function SortableRow({ id, venue, formatCurrency, onRemoveVenue }: {
    id: string;
    venue: Venue;
    formatCurrency: (v: number) => string;
    onRemoveVenue: (name: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        background: isDragging ? 'var(--bg-hover)' : undefined,
    };

    return (
        <tr ref={setNodeRef} style={style}>
            <td className="drag-handle-cell">
                <button type="button" className="drag-handle" {...attributes} {...listeners}>
                    ⠿
                </button>
            </td>
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
    );
}

export default function BundleView({
    bundle,
    venues,
    onDiscountChange,
    onRemoveVenue,
    onDeleteBundle,
    onRenameBundle,
    onNotesChange,
    onStatusChange,
    onReorderVenues,
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

    const [showConfirm, setShowConfirm] = useState(false);
    const [notesExpanded, setNotesExpanded] = useState(!!(bundle.notes));
    const [showExportMenu, setShowExportMenu] = useState(false);
    const notesRef = useRef<HTMLTextAreaElement>(null);

    // Status helpers
    const currentStatus = bundle.status || 'draft';
    const statusCfg = STATUS_CONFIG[currentStatus];

    // Drag & drop sensors and handler
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = bundle.venueNames.indexOf(active.id as string);
            const newIndex = bundle.venueNames.indexOf(over.id as string);
            const newOrder = arrayMove(bundle.venueNames, oldIndex, newIndex);
            onReorderVenues(bundle.id, newOrder);
        }
    };

    const handleDeleteClick = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setShowConfirm(true);
    };

    const confirmDelete = () => {
        setShowConfirm(false);
        onDeleteBundle(bundle.id);
    };

    const renderConfirmModal = () => {
        if (!showConfirm) return null;
        return (
            <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowConfirm(false); }}>
                <div className="modal-dialog" style={{ width: 400, padding: 24 }}>
                    <h3 style={{ fontSize: 17, marginBottom: 12, color: 'var(--text-primary)' }}>Delete Bundle</h3>
                    <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 24 }}>
                        Are you sure you want to delete the bundle <strong>{bundle.name}</strong>?<br />
                        All venues inside will become unassigned.
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                        <button type="button" className="modal-cancel-btn" onClick={() => setShowConfirm(false)}>Cancel</button>
                        <button type="button" className="modal-confirm-btn" style={{ backgroundColor: '#DC2626' }} onClick={confirmDelete}>Delete</button>
                    </div>
                </div>
            </div>
        );
    };

    // ── Status Selector ──
    const renderStatusSelector = () => (
        <div className="bundle-status-selector">
            {(Object.keys(STATUS_CONFIG) as BundleStatus[]).map(s => {
                const cfg = STATUS_CONFIG[s];
                const isActive = currentStatus === s;
                return (
                    <button
                        key={s}
                        type="button"
                        className={`status-pill ${isActive ? 'active' : ''}`}
                        style={{
                            '--status-color': cfg.color,
                            backgroundColor: isActive ? cfg.color + '20' : 'transparent',
                            borderColor: isActive ? cfg.color : 'var(--border)',
                            color: isActive ? cfg.color : 'var(--text-secondary)',
                        } as React.CSSProperties}
                        onClick={() => onStatusChange(bundle.id, s)}
                    >
                        <span className="status-pill-icon">{cfg.icon}</span>
                        {cfg.label}
                    </button>
                );
            })}
        </div>
    );

    // ── Notes Section ──
    const renderNotesSection = () => (
        <div className="bundle-notes-section">
            <button
                type="button"
                className="notes-toggle-btn"
                onClick={() => setNotesExpanded(!notesExpanded)}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: notesExpanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                    <polyline points="9 18 15 12 9 6" />
                </svg>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                Notes
                {bundle.notes && !notesExpanded && (
                    <span className="notes-indicator">●</span>
                )}
            </button>
            {notesExpanded && (
                <textarea
                    ref={notesRef}
                    className="bundle-notes-textarea"
                    value={bundle.notes || ''}
                    onChange={e => onNotesChange(bundle.id, e.target.value)}
                    placeholder="Add estimator notes… e.g. &quot;Client wants this done by Q3&quot;"
                    rows={3}
                />
            )}
        </div>
    );

    // ── Empty state ──
    if (bundleVenues.length === 0) {
        return (
            <div className="bundle-empty">
                <div className="bundle-empty-banner" style={{ borderColor: bundle.color, backgroundColor: bundle.color + '18' }}>
                    <span className="bundle-color-indicator" style={{ backgroundColor: bundle.color }} />
                    <h2>{bundle.name}</h2>
                    <span className="status-badge-inline" style={{ backgroundColor: statusCfg.color + '20', color: statusCfg.color }}>
                        {statusCfg.icon} {statusCfg.label}
                    </span>
                </div>
                {renderStatusSelector()}
                {renderNotesSection()}
                <div className="bundle-empty-body">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </svg>
                    <p>No venues assigned to this bundle yet.</p>
                    <p className="hint">Click a marker on the map and use the <strong>Add to Bundle</strong> dropdown to assign venues here.</p>
                    <button type="button" className="delete-bundle-btn ghost" onClick={handleDeleteClick}>Delete this bundle</button>
                </div>
                {renderConfirmModal()}
            </div>
        );
    }

    // ── Main view ──
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
                    <span className="status-badge-inline" style={{ backgroundColor: statusCfg.color + '20', color: statusCfg.color }}>
                        {statusCfg.icon} {statusCfg.label}
                    </span>
                </div>
                <button type="button" className="delete-bundle-btn" onClick={handleDeleteClick} title="Delete bundle">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                    </svg>
                    Delete Bundle
                </button>
                {/* Export dropdown */}
                <div className="export-dropdown-wrapper" style={{ position: 'relative' }}>
                    <button
                        type="button"
                        className="export-bundle-btn"
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        title="Export bundle"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Export
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>
                    {showExportMenu && (
                        <div className="export-dropdown-menu">
                            <button type="button" onClick={() => { exportCSV(bundle, venues); setShowExportMenu(false); }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                </svg>
                                Export as CSV
                            </button>
                            <button type="button" onClick={() => { exportPDF(bundle, venues); setShowExportMenu(false); }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="16" y1="13" x2="8" y2="13" />
                                    <line x1="16" y1="17" x2="8" y2="17" />
                                </svg>
                                Export as PDF
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Status selector */}
            {renderStatusSelector()}

            <div className="bundle-content">
                {/* Venue table */}
                <div className="bundle-table-container">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <table className="bundle-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 36 }}></th>
                                    <th>Venue Name</th>
                                    <th>Address</th>
                                    <th>Quote No</th>
                                    <th>Date</th>
                                    <th className="text-right">Original Value</th>
                                    <th>Remove</th>
                                </tr>
                            </thead>
                            <tbody>
                                <SortableContext
                                    items={bundle.venueNames}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {bundleVenues.map(venue => (
                                        <SortableRow
                                            key={venue['Venue name']}
                                            id={venue['Venue name']}
                                            venue={venue}
                                            formatCurrency={formatCurrency}
                                            onRemoveVenue={onRemoveVenue}
                                        />
                                    ))}
                                </SortableContext>
                            </tbody>
                        </table>
                    </DndContext>
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

                {/* Notes section */}
                {renderNotesSection()}
            </div>
            {renderConfirmModal()}
        </div>
    );
}
