import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Venue, Bundle, QuoteStatus } from '../types';


interface DashboardProps {
    venues: Venue[];
    bundles: Bundle[];
    quoteStatuses: Record<string, QuoteStatus>;
    onClose: () => void;
    onSelectBundle: (bundleId: string) => void;
}

const PIPELINE_CONFIG: Record<QuoteStatus, { label: string; color: string }> = {
    draft: { label: 'Draft', color: '#94A3B8' },
    submitted: { label: 'Submitted', color: '#3B82F6' },
    won: { label: 'Won', color: '#22C55E' },
    lost: { label: 'Lost', color: '#EF4444' },
};

export default function Dashboard({ venues, bundles, quoteStatuses, onClose, onSelectBundle }: DashboardProps) {
    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(amount);

    // 1. High-Level KPIs
    const totalQuotes = venues.filter(v => !v.is_hq).length;
    const totalValue = venues.filter(v => !v.is_hq).reduce((s, v) => s + (v['Sub Total'] || 0), 0);
    const assignedNames = new Set(bundles.flatMap(b => b.venueNames));
    const assignedCount = assignedNames.size;
    const assignmentRate = totalQuotes > 0 ? (assignedCount / totalQuotes) * 100 : 0;
    const averageValue = totalQuotes > 0 ? totalValue / totalQuotes : 0;

    // 2. Bundle Data
    const bundleData = useMemo(() => {
        return bundles.map((b) => {
            const bVenues = venues.filter(v => b.venueNames.includes(v['Venue name']));
            const val = bVenues.reduce((s, v) => s + (v['Sub Total'] || 0), 0);
            return {
                id: b.id,
                name: b.name,
                color: b.color,
                value: val,
                count: bVenues.length
            };
        }).sort((a, b) => b.value - a.value);
    }, [bundles, venues]);

    // 3. Pipeline Data
    const pipelineData = useMemo(() => {
        const counts: Record<QuoteStatus, number> = { draft: 0, submitted: 0, won: 0, lost: 0 };
        const values: Record<QuoteStatus, number> = { draft: 0, submitted: 0, won: 0, lost: 0 };

        venues.filter(v => !v.is_hq).forEach(v => {
            const status = quoteStatuses[v['Venue name']] || 'draft';
            counts[status]++;
            values[status] += (v['Sub Total'] || 0);
        });

        return (Object.entries(PIPELINE_CONFIG) as [QuoteStatus, { label: string, color: string }][]).map(([status, config]) => ({
            name: config.label,
            status: status,
            count: counts[status],
            value: values[status],
            color: config.color
        })).filter(d => d.count > 0);
    }, [venues, quoteStatuses]);


    // 4. State Data
    const stateData = useMemo(() => {
        const states: Record<string, { count: number, value: number }> = {};
        venues.filter(v => !v.is_hq).forEach(v => {
            // Extract state from address (assuming standard Aussie format like "Sydney NSW 2000")
            const addr = v['Site address'] || '';
            const match = addr.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/i);
            const state = match ? match[1].toUpperCase() : 'Other';
            if (!states[state]) states[state] = { count: 0, value: 0 };
            states[state].count++;
            states[state].value += (v['Sub Total'] || 0);
        });
        return Object.entries(states)
            .map(([state, data]) => ({ state, ...data }))
            .sort((a, b) => b.value - a.value);
    }, [venues]);


    // 5. Top Venues
    const topVenues = useMemo(() => {
        return [...venues.filter(v => !v.is_hq)]
            .sort((a, b) => (b['Sub Total'] || 0) - (a['Sub Total'] || 0))
            .slice(0, 5);
    }, [venues]);

    return (
        <div className="dashboard-panel" onClick={(e) => e.stopPropagation()}>
            <div className="dashboard-header">
                <div>
                    <h2>Portfolio Dashboard</h2>
                    <p>Insights & Analytics</p>
                </div>
                <button className="dashboard-close-btn" onClick={onClose} aria-label="Close Dashboard">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <div className="dashboard-content">
                {/* 1. KPIs */}
                <div className="dashboard-section kpi-hero">
                    <div className="hero-stat main">
                        <span className="hero-label">Total Pipeline Value</span>
                        <span className="hero-value">{formatCurrency(totalValue)}</span>
                    </div>
                    <div className="hero-secondary">
                        <div className="hero-stat">
                            <span className="hero-label">Total Quotes</span>
                            <span className="hero-value">{totalQuotes}</span>
                        </div>
                        <div className="hero-stat">
                            <span className="hero-label">Avg. Quote</span>
                            <span className="hero-value">{formatCurrency(averageValue)}</span>
                        </div>
                        <div className="hero-stat">
                            <span className="hero-label">Bundled</span>
                            <span className="hero-value">{assignmentRate.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>

                {/* 2. Pipeline Chart */}
                <div className="dashboard-section chart-section">
                    <h3>Pipeline Status</h3>
                    <div style={{ height: 220 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={pipelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                                <YAxis
                                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'var(--bg-hover)' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="dash-tooltip">
                                                    <div className="dash-tt-title">{data.name}</div>
                                                    <div className="dash-tt-val">{formatCurrency(data.value)}</div>
                                                    <div className="dash-tt-sub">{data.count} Quotes</div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {pipelineData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. Bundle Breakdown */}
                {bundleData.length > 0 && (
                    <div className="dashboard-section chart-section">
                        <h3>Bundle Value Breakdown</h3>
                        <div style={{ height: 260 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={bundleData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: 'var(--text-primary)' }}
                                        width={100}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'var(--bg-hover)' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="dash-tooltip">
                                                        <div className="dash-tt-title" style={{ color: data.color }}>{data.name}</div>
                                                        <div className="dash-tt-val">{formatCurrency(data.value)}</div>
                                                        <div className="dash-tt-sub">{data.count} Venues</div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} onClick={(data: any) => onSelectBundle(data.id)} style={{ cursor: 'pointer' }}>
                                        {bundleData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}


                <div className="dashboard-row">
                    {/* 4. State Breakdown */}
                    <div className="dashboard-section half">
                        <h3>By State</h3>
                        <div className="state-list">
                            {stateData.map((s: any) => (
                                <div key={s.state} className="state-item">
                                    <div className="state-item-left">
                                        <span className="state-name">{s.state}</span>
                                        <span className="state-count">{s.count}</span>
                                    </div>
                                    <span className="state-value">{formatCurrency(s.value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 5. Top Venues */}
                    <div className="dashboard-section half">
                        <h3>Top 5 Venues</h3>
                        <div className="top-venues-list">
                            {topVenues.map((v: any, i: number) => (
                                <div key={v['Venue name']} className="top-venue-item">
                                    <div className="tv-rank">{i + 1}</div>
                                    <div className="tv-details">
                                        <span className="tv-name">{v['Venue name']}</span>
                                        <span className="tv-value">{formatCurrency(v['Sub Total'] || 0)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
