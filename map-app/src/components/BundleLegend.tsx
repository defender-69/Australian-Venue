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

        // Build HTML
        let html = '<div class="legend-header">Bundles</div>';

        if (bundles.length === 0) {
            html += '<div class="legend-empty">No bundles</div>';
        } else {
            html += '<div class="legend-items">';
            for (const bundle of bundles) {
                const hidden = hiddenBundleIds.has(bundle.id);
                html += `
                    <button class="legend-item ${hidden ? 'legend-item--hidden' : ''}" data-bundle-id="${bundle.id}">
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
            <button class="legend-item legend-item--unassigned ${unassignedHidden ? 'legend-item--hidden' : ''}" data-bundle-id="__unassigned__">
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
