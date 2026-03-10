import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
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
type SortKey = 'Venue name' | 'State' | 'Sub Total' | 'Quote No' | 'Date' | 'status' | 'bundle';

export default function Dashboard({ venues, bundles, quoteStatuses, onClose, onSelectBundle }: DashboardProps) {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'Sub Total', direction: 'desc' });
    const [filters, setFilters] = useState({
        venue: '',
        quoteNo: '',
        state: '',
        status: '',
        bundle: ''
    });

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(amount);

    // 1. High-Level KPIs
    const totalQuotes = venues.filter(v => !v.is_hq).length;
    let totalValue = 0;
    let wonQuotes = 0;

    venues.filter(v => !v.is_hq).forEach(v => {
        totalValue += (v['Sub Total'] || 0);
        if (quoteStatuses[v['Venue name']] === 'won') {
            wonQuotes++;
        }
    });

    const assignedNames = new Set(bundles.flatMap(b => b.venueNames));
    const assignedCount = assignedNames.size;
    const assignmentRate = totalQuotes > 0 ? (assignedCount / totalQuotes) * 100 : 0;
    const averageValue = totalQuotes > 0 ? totalValue / totalQuotes : 0;
    const winRate = totalQuotes > 0 ? (wonQuotes / totalQuotes) * 100 : 0;

    const totalDiscountImpact = bundles.reduce((acc, bundle) => {
        const bundleVenues = venues.filter(v => bundle.venueNames.includes(v['Venue name']));
        const bundleTotal = bundleVenues.reduce((s, v) => s + (v['Sub Total'] || 0), 0);
        const discountAmount = bundleTotal * (bundle.discount / 100);
        return acc + discountAmount;
    }, 0);

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
    // 6. Time-Series Data (Cumulative Pipeline)
    const timeSeriesData = useMemo(() => {
        const sortedVenues = [...venues.filter(v => !v.is_hq)]
            .map(v => {
                const parts = (v['Date'] || '').split('/');
                let dateObj = new Date(0);
                if (parts.length === 3) {
                    dateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                }
                return { ...v, dateObj, timestamp: dateObj.getTime() };
            })
            .filter(v => v.timestamp > 0)
            .sort((a, b) => a.timestamp - b.timestamp);

        let cumulative = 0;
        const dataMap = new Map<string, number>();

        sortedVenues.forEach(v => {
            cumulative += (v['Sub Total'] || 0);
            const monthStr = v.dateObj.toLocaleString('default', { month: 'short', year: '2-digit' });
            // We store the max cumulative value reached by the end of each month
            dataMap.set(monthStr, cumulative);
        });

        return Array.from(dataMap.entries()).map(([date, cumulativeValue]) => ({
            date,
            cumulativeValue
        }));
    }, [venues]);

    // 7. Pipeline Matrix by State
    const statePipelineData = useMemo(() => {
        const statesMap: Record<string, Record<QuoteStatus, number>> = {};

        venues.filter(v => !v.is_hq).forEach(v => {
            const addr = v['Site address'] || '';
            const match = addr.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/i);
            const state = match ? match[1].toUpperCase() : 'Other';

            const status = quoteStatuses[v['Venue name']] || 'draft';

            if (!statesMap[state]) {
                statesMap[state] = { draft: 0, submitted: 0, won: 0, lost: 0 };
            }
            statesMap[state][status] += (v['Sub Total'] || 0);
        });

        return Object.entries(statesMap)
            .map(([state, statuses]) => ({
                state,
                ...statuses,
                total: statuses.draft + statuses.submitted + statuses.won + statuses.lost
            }))
            .sort((a, b) => b.total - a.total);
    }, [venues, quoteStatuses]);


    // 8. Interactive Data Grid Processing
    const tableData = useMemo(() => {
        let data = venues.filter(v => !v.is_hq).map(v => {
            const addr = v['Site address'] || '';
            const match = addr.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/i);
            const state = match ? match[1].toUpperCase() : 'Other';
            const status = quoteStatuses[v['Venue name']] || 'draft';
            const bundle = bundles.find(b => b.venueNames.includes(v['Venue name']));

            const dateParts = (v['Date'] || '').split('/');
            let dateVal = 0;
            if (dateParts.length === 3) {
                dateVal = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0])).getTime();
            }

            return {
                ...v,
                State: state,
                status: status,
                bundleName: bundle ? bundle.name : 'Unassigned',
                bundleId: bundle ? bundle.id : null,
                bundleColor: bundle ? bundle.color : 'transparent',
                dateVal
            };
        });

        // Apply column filters
        if (filters.venue) {
            const lowerVenue = filters.venue.toLowerCase();
            data = data.filter(r => r['Venue name'].toLowerCase().includes(lowerVenue));
        }
        if (filters.quoteNo) {
            const lowerQuoteNo = filters.quoteNo.toLowerCase();
            data = data.filter(r => String(r['Quote No']).toLowerCase().includes(lowerQuoteNo));
        }
        if (filters.state) {
            data = data.filter(r => r.State === filters.state);
        }
        if (filters.status) {
            data = data.filter(r => r.status === filters.status);
        }
        if (filters.bundle) {
            if (filters.bundle === 'unassigned') {
                data = data.filter(r => !r.bundleId);
            } else {
                data = data.filter(r => r.bundleId === filters.bundle);
            }
        }

        data.sort((a, b) => {
            let valA: any = (a as any)[sortConfig.key];
            let valB: any = (b as any)[sortConfig.key];

            // Handle special comparable fields
            if (sortConfig.key === 'Date') {
                valA = a.dateVal;
                valB = b.dateVal;
            } else if (sortConfig.key === 'bundle') {
                valA = a.bundleName;
                valB = b.bundleName;
            } else if (sortConfig.key === 'Sub Total') {
                valA = a['Sub Total'] || 0;
                valB = b['Sub Total'] || 0;
            } else if (sortConfig.key === 'Quote No') {
                valA = Number(a['Quote No'] || 0);
                valB = Number(b['Quote No'] || 0);
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return data;
    }, [venues, quoteStatuses, bundles, sortConfig]);

    const handleSort = (key: SortKey) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };


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
                            <span className="hero-label">Win Rate</span>
                            <span className="hero-value">{winRate.toFixed(1)}%</span>
                        </div>
                        <div className="hero-stat">
                            <span className="hero-label">Avg. Quote</span>
                            <span className="hero-value">{formatCurrency(averageValue)}</span>
                        </div>
                        <div className="hero-stat">
                            <span className="hero-label">Bundled</span>
                            <span className="hero-value">{assignmentRate.toFixed(1)}%</span>
                        </div>
                        <div className="hero-stat" style={{ color: totalDiscountImpact > 0 ? '#FECACA' : 'inherit' }}>
                            <span className="hero-label">Total Discounts</span>
                            <span className="hero-value">-{formatCurrency(totalDiscountImpact)}</span>
                        </div>
                    </div>
                </div>

                {/* Row 1: Pipeline Chart & Cumulative Growth */}
                <div className="dashboard-row">
                    <div className="dashboard-section half chart-section">
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

                    <div className="dashboard-section half chart-section">
                        <h3>Cumulative Pipeline Growth</h3>
                        <div style={{ height: 220 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                                    <YAxis
                                        tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                    />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="dash-tooltip">
                                                        <div className="dash-tt-title">{data.date}</div>
                                                        <div className="dash-tt-val">{formatCurrency(data.cumulativeValue)}</div>
                                                        <div className="dash-tt-sub">Total Portfolio Value</div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Area type="monotone" dataKey="cumulativeValue" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Row 2: Status by State & Bundle Breakdown */}
                <div className="dashboard-row">
                    <div className="dashboard-section half chart-section">
                        <h3>Status by State</h3>
                        <div style={{ height: 260 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statePipelineData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis dataKey="state" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-primary)' }} />
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
                                                        <div className="dash-tt-title">{data.state} Total: {formatCurrency(data.total)}</div>
                                                        {payload.map((p: any) => (
                                                            p.value > 0 && (
                                                                <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '12px', marginTop: '4px' }}>
                                                                    <span style={{ color: p.color, textTransform: 'capitalize' }}>{p.dataKey}</span>
                                                                    <span style={{ fontWeight: 600 }}>{formatCurrency(p.value)}</span>
                                                                </div>
                                                            )
                                                        ))}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="draft" stackId="a" fill={PIPELINE_CONFIG.draft.color} />
                                    <Bar dataKey="submitted" stackId="a" fill={PIPELINE_CONFIG.submitted.color} />
                                    <Bar dataKey="won" stackId="a" fill={PIPELINE_CONFIG.won.color} />
                                    <Bar dataKey="lost" stackId="a" fill={PIPELINE_CONFIG.lost.color} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {bundleData.length > 0 && (
                        <div className="dashboard-section half chart-section">
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
                </div>


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

                {/* 8. Interactive Data Grid */}
                <div className="dashboard-section table-section">
                    <div className="dash-table-header">
                        <h3>All Quotes Data</h3>
                        <div className="dash-table-filters">
                            <input
                                type="text"
                                className="dash-filter-input"
                                placeholder="Search venue..."
                                value={filters.venue}
                                onChange={(e) => setFilters(prev => ({ ...prev, venue: e.target.value }))}
                            />
                            <input
                                type="text"
                                className="dash-filter-input"
                                placeholder="Search quote..."
                                value={filters.quoteNo}
                                onChange={(e) => setFilters(prev => ({ ...prev, quoteNo: e.target.value }))}
                            />
                            <select
                                className="dash-filter-select"
                                value={filters.state}
                                onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value }))}
                            >
                                <option value="">All States</option>
                                {Array.from(new Set(stateData.map(s => s.state))).sort().map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <select
                                className="dash-filter-select"
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="">All Statuses</option>
                                <option value="draft">Draft</option>
                                <option value="submitted">Submitted</option>
                                <option value="won">Won</option>
                                <option value="lost">Lost</option>
                            </select>
                            <select
                                className="dash-filter-select"
                                value={filters.bundle}
                                onChange={(e) => setFilters(prev => ({ ...prev, bundle: e.target.value }))}
                            >
                                <option value="">All Bundles</option>
                                <option value="unassigned">Unassigned</option>
                                {bundles.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                            <button
                                className="dash-filter-reset"
                                onClick={() => setFilters({ venue: '', quoteNo: '', state: '', status: '', bundle: '' })}
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                    <div className="dash-table-container">
                        <table className="dash-table">
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('Venue name')}>Venue {sortConfig.key === 'Venue name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                    <th onClick={() => handleSort('Quote No')}>Quote No {sortConfig.key === 'Quote No' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                    <th onClick={() => handleSort('State')}>State {sortConfig.key === 'State' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                    <th onClick={() => handleSort('Date')}>Date {sortConfig.key === 'Date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                    <th onClick={() => handleSort('Sub Total')} style={{ textAlign: 'right' }}>Total {sortConfig.key === 'Sub Total' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                    <th onClick={() => handleSort('status')}>Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                    <th onClick={() => handleSort('bundle')}>Bundle {sortConfig.key === 'bundle' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.map((row, i) => (
                                    <tr key={`${row['Venue name']}-${i}`}>
                                        <td className="dash-td-main">{row['Venue name']}</td>
                                        <td>
                                            {row.pdf_filename ? (
                                                <a
                                                    href={`${import.meta.env.BASE_URL}quotes/${encodeURIComponent(row.pdf_filename)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="dash-quote-link"
                                                    title="View Quote PDF"
                                                >
                                                    {row['Quote No']}
                                                </a>
                                            ) : (
                                                row['Quote No']
                                            )}
                                        </td>
                                        <td>{row.State}</td>
                                        <td>{row.Date}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(row['Sub Total'] || 0)}</td>
                                        <td>
                                            <span className="dash-status-badge" style={{ backgroundColor: PIPELINE_CONFIG[row.status as QuoteStatus].color + '20', color: PIPELINE_CONFIG[row.status as QuoteStatus].color }}>
                                                {PIPELINE_CONFIG[row.status as QuoteStatus].label}
                                            </span>
                                        </td>
                                        <td>
                                            {row.bundleId ? (
                                                <button
                                                    className="dash-bundle-btn"
                                                    style={{ borderLeftColor: row.bundleColor }}
                                                    onClick={() => row.bundleId && onSelectBundle(row.bundleId)}
                                                >
                                                    {row.bundleName}
                                                </button>
                                            ) : (
                                                <span className="dash-unassigned">Unassigned</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
