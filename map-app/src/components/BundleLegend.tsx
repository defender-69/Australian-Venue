import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Bundle } from '../types';

interface BundleLegendProps {
    bundles: Bundle[];
    hiddenBundleIds: Set<string>;
    onToggle: (bundleId: string) => void;
}

export default function BundleLegend({ bundles, hiddenBundleIds, onToggle }: BundleLegendProps) {
    const map = useMap();
    const controlRef = useRef<L.Control | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Create the control once
    useEffect(() => {
        const LegendControl = L.Control.extend({
            options: { position: 'bottomright' as L.ControlPosition },
            onAdd() {
                const container = L.DomUtil.create('div', 'bundle-legend');
                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.disableScrollPropagation(container);
                containerRef.current = container;
                return container;
            },
        });

        controlRef.current = new LegendControl();
        controlRef.current.addTo(map);

        return () => {
            if (controlRef.current) {
                controlRef.current.remove();
            }
        };
    }, [map]);

    // Update the content whenever bundles or visibility changes
    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;

        const eyeSvg = (hidden: boolean) => hidden
            ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="legend-eye opacity-50"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"></path></svg>`
            : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="legend-eye"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;

        // Build HTML
        let html = '<div class="legend-header">Bundle View Toggle</div>';

        if (bundles.length === 0) {
            html += '<div class="legend-empty">No bundles</div>';
        } else {
            html += '<div class="legend-items">';
            for (const bundle of bundles) {
                const hidden = hiddenBundleIds.has(bundle.id);
                html += `
                    <button class="legend-item ${hidden ? 'legend-item--hidden' : ''}" data-bundle-id="${bundle.id}" title="Toggle visibility">
                        ${eyeSvg(hidden)}
                        <span class="legend-dot" style="background-color: ${bundle.color}"></span>
                        <span class="legend-name">${bundle.name}</span>
                        <span class="legend-count">${bundle.venueNames.length}</span>
                    </button>
                `;
            }
            html += '</div>';
        }

        // Unassigned row
        const unassignedHidden = hiddenBundleIds.has('__unassigned__');
        html += `
            <button class="legend-item legend-item--unassigned ${unassignedHidden ? 'legend-item--hidden' : ''}" data-bundle-id="__unassigned__" title="Toggle unassigned venues">
                ${eyeSvg(unassignedHidden)}
                <span class="legend-dot" style="background-color: #9AA0B0"></span>
                <span class="legend-name">Unassigned</span>
            </button>
        `;

        container.innerHTML = html;

        // Attach click listeners
        const buttons = container.querySelectorAll('.legend-item');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const bundleId = (btn as HTMLElement).dataset.bundleId;
                if (bundleId) onToggle(bundleId);
            });
        });
    }, [bundles, hiddenBundleIds, onToggle]);

    return null;
}
