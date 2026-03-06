import { useState } from 'react';
import { BUNDLE_COLORS } from './LeftPanel';
import type { Bundle } from '../types';

interface CreateBundleModalProps {
    bundles: Bundle[];
    onConfirm: (name: string, color: string) => void;
    onCancel: () => void;
}

export default function CreateBundleModal({ bundles, onConfirm, onCancel }: CreateBundleModalProps) {
    const usedColors = new Set(bundles.map(b => b.color));
    const firstAvailable = BUNDLE_COLORS.find(c => !usedColors.has(c)) ?? BUNDLE_COLORS[0];

    const [name, setName] = useState('');
    const [selectedColor, setSelectedColor] = useState(firstAvailable);

    const handleConfirm = () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        onConfirm(trimmed, selectedColor);
    };

    return (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
            <div className="modal-dialog">
                <div className="modal-header">
                    <h2 className="modal-title">Create New Bundle</h2>
                    <button className="modal-close-btn" onClick={onCancel} aria-label="Close">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className="modal-body">
                    <div className="modal-field">
                        <label htmlFor="bundle-name-input" className="modal-label">Bundle Name</label>
                        <input
                            id="bundle-name-input"
                            type="text"
                            className="modal-text-input"
                            placeholder="e.g. VIC Hotels, QLD Taverns…"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') onCancel(); }}
                            autoFocus
                            maxLength={40}
                        />
                    </div>

                    <div className="modal-field">
                        <label className="modal-label">Bundle Colour</label>
                        <div className="colour-palette">
                            {BUNDLE_COLORS.map(color => {
                                const isUsed = usedColors.has(color) && color !== selectedColor;
                                return (
                                    <button
                                        key={color}
                                        className={`swatch ${selectedColor === color ? 'swatch-selected' : ''} ${isUsed ? 'swatch-used' : ''}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setSelectedColor(color)}
                                        title={isUsed ? `${color} (already in use)` : color}
                                        aria-label={`Select colour ${color}`}
                                    />
                                );
                            })}
                        </div>
                        <div className="selected-colour-preview">
                            <span className="swatch-dot" style={{ backgroundColor: selectedColor }} />
                            <span className="selected-colour-hex">{selectedColor}</span>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="modal-cancel-btn" onClick={onCancel}>Cancel</button>
                    <button
                        className="modal-confirm-btn"
                        onClick={handleConfirm}
                        disabled={!name.trim()}
                        style={{ backgroundColor: selectedColor }}
                    >
                        Create Bundle
                    </button>
                </div>
            </div>
        </div>
    );
}
