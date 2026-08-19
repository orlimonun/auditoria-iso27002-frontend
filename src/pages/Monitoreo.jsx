import { useMemo, useState } from 'react';
import {
    Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
    ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
    clientesMonitoreo, getClientAlerts, getClientStatus, getHealthScore,
    getMetricStatus, getScoreStatus, metricDefinitions, MONITOR_WEIGHTS,
} from '../mockData/monitoreo';

const statusInfo = {
    optimal: { label: 'Óptimo', color: '#22c55e' },
    healthy: { label: 'Saludable', color: '#4ade80' },
    warning: { label: 'Advertencia', color: '#fbbf24' },
    degraded: { label: 'Degradado', color: '#fb923c' },
    critical: { label: 'Crítico', color: '#f87171' },
    normal: { label: 'Normal', color: '#4ade80' },
};

const metricStatusLabel = {
    normal: 'Normal', warning: 'Advertencia', degraded: 'Alto', critical: 'Crítico',
};

function TrafficLight({ status, compact = false }) {
    const activeLamp = ['optimal', 'healthy', 'normal'].includes(status)
        ? 'green'
        : status === 'warning' ? 'yellow' : 'red';
    return (
        <span className={`monitor-traffic ${compact ? 'compact' : ''}`} aria-label={`Estado ${statusInfo[status].label}`}>
            {['red', 'yellow', 'green'].map((lamp) => (
                <span
                    key={lamp}
                    className={`monitor-traffic-light ${activeLamp === lamp ? 'is-active' : ''}`}
                    style={activeLamp === lamp ? { '--lamp-color': statusInfo[status].color } : undefined}
                />
            ))}
        </span>
    );
}

function HealthRing({ score, size = 'large', status }) {
    const ringStatus = status ?? getScoreStatus(score);
    return (
        <div className={`health-ring ${size}`} style={{ '--score': `${score * 3.6}deg`, '--ring-color': statusInfo[ringStatus].color }}>
            <div className="health-ring-center"><strong>{score}</strong><span>/100</span></div>
        </div>
    );
}

function StatusLegend() {
    return (
        <div className="monitor-legend" aria-label="Escala del ISBD">
            {['optimal', 'healthy', 'warning', 'degraded', 'critical'].map((key) => (
                <span key={key}><i className={`legend-dot ${key}`} />{statusInfo[key].label}</span>
            ))}
        </div>
    );
}

function ClientCard({ cliente, onOpen }) {
    const health = getHealthScore(cliente);
    const realStatus = getClientStatus(cliente);
    const alerts = getClientAlerts(cliente);
    const indicators = [
        { key: 'indice', label: 'ISBD', score: health, status: realStatus },
        ...Object.entries(metricDefinitions).map(([key, definition]) => ({
            key, label: `${definition.code} · ${definition.shortLabel}`,
            score: cliente.scores[key], status: getScoreStatus(cliente.scores[key]),
        })),
    ];

    return (
        <article className={`monitor-client-card status-${realStatus}`} role="button" tabIndex={0}
                 onClick={() => onOpen(cliente, 'indice')}
                 onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpen(cliente, 'indice'); }}>
            <header className="client-card-head">
                <div>
                    <span className="client-live"><i /> EN LÍNEA</span>
                    <h2>{cliente.nombre}</h2>
                    <p className="mono">{cliente.instancia}</p>
                </div>
                <HealthRing score={health} status={realStatus} size="small" />
            </header>
            <div className="client-alert-summary">
                <span className={`state-pill ${realStatus}`}>{statusInfo[realStatus].label}</span>
                <small>{alerts.length === 0 ? 'Sin alertas activas' : `${alerts.length} alertas activas`}</small>
            </div>
            <div className="client-indicators">
                {indicators.map((indicator) => (
                    <button key={indicator.key} className={`client-indicator indicator-${indicator.status}`}
                            onClick={(event) => { event.stopPropagation(); onOpen(cliente, indicator.key); }}>
                        <TrafficLight status={indicator.status} compact />
                        <span><small>{indicator.label}</small><strong>{indicator.score}<em>/100</em></strong></span>
                        <b aria-hidden="true">›</b>
                    </button>
                ))}
            </div>
            <footer className="client-card-foot"><span>{cliente.ubicacion}</span><span className="mono">↻ {cliente.ultimaActualizacion}</span></footer>
        </article>
    );
}

function AlertsPanel({ cliente, onSelectCategory }) {
    const order = { critical: 0, degraded: 1, warning: 2 };
    const alerts = [...getClientAlerts(cliente)].sort((a, b) => order[a.status] - order[b.status]);
    return (
        <section className="monitor-alerts-panel">
            <div className="overview-intro">
                <div><span className="detail-eyebrow mono">ALERTAS ACTIVAS</span><h3>Problemas que no debe ocultar el índice</h3></div>
                <p>Fecha y hora: ahora · {cliente.ultimaActualizacion}</p>
            </div>
            {alerts.length === 0 ? (
                <div className="alert-empty"><i className="legend-dot healthy" /> Todos los componentes se encuentran dentro de los rangos normales.</div>
            ) : (
                <div className="alert-list">
                    {alerts.slice(0, 8).map((alert) => (
                        <button key={`${alert.categoryKey}-${alert.variable}`} className={`monitor-alert status-${alert.status}`}
                                onClick={() => onSelectCategory(alert.categoryKey)}>
                            <i className={`legend-dot ${alert.status}`} />
                            <span><strong>{alert.variable}</strong><small>{alert.component} · valor {alert.value}</small></span>
                            <span className="alert-threshold"><small>Rango normal</small><b>{alert.threshold}</b></span>
                            <em>{metricStatusLabel[alert.status]}</em>
                        </button>
                    ))}
                </div>
            )}
        </section>
    );
}

function OverviewDetail({ cliente, onSelectCategory }) {
    const health = getHealthScore(cliente);
    const scoreStatus = getScoreStatus(health);
    const realStatus = getClientStatus(cliente);

    return (
        <div className="monitor-overview-wrapper">
            <div className="monitor-overview-detail">
                <section className="overview-score-panel">
                    <span className="detail-eyebrow mono">ISBD · ÍNDICE GLOBAL</span>
                    <HealthRing score={health} status={realStatus} />
                    <strong className={`status-text ${realStatus}`}>Estado real: {statusInfo[realStatus].label}</strong>
                    {scoreStatus !== realStatus && <p className="critical-override">La puntuación es {statusInfo[scoreStatus].label}, pero existe una alerta crítica.</p>}
                    <p className="health-formula mono">0.30(IP) + 0.35(IM) + 0.35(IA)</p>
                </section>
                <section className="overview-categories">
                    <div className="overview-intro">
                        <div><span className="detail-eyebrow mono">INDICADORES PONDERADOS</span><h3>Procesos, memoria y archivos</h3></div>
                        <p>Selecciona un componente para consultar variables, umbrales y fuentes Oracle.</p>
                    </div>
                    <div className="overview-category-grid">
                        {Object.entries(metricDefinitions).map(([key, definition]) => {
                            const score = cliente.scores[key];
                            const status = getScoreStatus(score);
                            const alerts = definition.metrics.filter((metric) => getMetricStatus(metric, cliente.values[metric.key]) !== 'normal').length;
                            return (
                                <button key={key} className={`overview-category status-${status}`} onClick={() => onSelectCategory(key)}>
                                    <div className="overview-category-title">
                                        <TrafficLight status={status} compact />
                                        <span><small>{definition.code} · peso {MONITOR_WEIGHTS[key] * 100}%</small><strong>{score}/100</strong></span>
                                    </div>
                                    <div className="overview-category-bar"><i style={{ width: `${score}%` }} /></div>
                                    <p>{alerts === 0 ? 'Todas las variables normales' : `${alerts} variables requieren atención`}</p>
                                    <span className="category-link">Ver {definition.label.toLowerCase()} <b>→</b></span>
                                </button>
                            );
                        })}
                    </div>
                </section>
            </div>
            <AlertsPanel cliente={cliente} onSelectCategory={onSelectCategory} />
            <section className="monitor-history-panel">
                <div className="overview-intro">
                    <div><span className="detail-eyebrow mono">EVOLUCIÓN HISTÓRICA</span><h3>Índice de salud durante el día</h3></div>
                    <p>Datos simulados para el frontend; después provendrán del registro histórico.</p>
                </div>
                <div className="history-chart">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={cliente.history} margin={{ top: 8, right: 18, left: -20, bottom: 0 }}>
                            <CartesianGrid stroke="var(--line)" vertical={false} />
                            <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                            <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                            <Tooltip content={<HistoryTooltip />} />
                            <Line type="monotone" dataKey="isbd" stroke={statusInfo[realStatus].color} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </section>
        </div>
    );
}

function getScaleBackground(metric) {
    if (metric.reference) return 'linear-gradient(90deg, var(--violet), var(--blue))';
    if (metric.criticalBelow !== undefined) {
        const critical = (metric.criticalBelow / metric.max) * 100;
        const degraded = (metric.degradedBelow / metric.max) * 100;
        const warning = (metric.warningBelow / metric.max) * 100;
        return `linear-gradient(90deg, var(--monitor-critical) 0 ${critical}%, var(--monitor-degraded) ${critical}% ${degraded}%, var(--monitor-warning) ${degraded}% ${warning}%, var(--monitor-normal) ${warning}% 100%)`;
    }
    const warning = (metric.warningAt / metric.max) * 100;
    const degraded = (metric.degradedAt / metric.max) * 100;
    const critical = (metric.criticalAt / metric.max) * 100;
    return `linear-gradient(90deg, var(--monitor-normal) 0 ${warning}%, var(--monitor-warning) ${warning}% ${degraded}%, var(--monitor-degraded) ${degraded}% ${critical}%, var(--monitor-critical) ${critical}% 100%)`;
}

function MetricCard({ metric, value }) {
    const status = getMetricStatus(metric, value);
    const progress = Math.min((value / metric.max) * 100, 100);
    return (
        <article className={`metric-card status-${status}`}>
            <header>
                <div><span className="metric-status"><i />{metric.reference ? 'Referencia' : metricStatusLabel[status]}</span><h4>{metric.label}</h4></div>
                <TrafficLight status={status} compact />
            </header>
            <div className="metric-current"><strong>{value}</strong><span>{metric.unit}</span></div>
            <div className="metric-scale" style={{ background: getScaleBackground(metric) }}><i style={{ width: `${progress}%` }} /><b style={{ left: `${progress}%` }} /></div>
            {metric.reference ? (
                <div className="metric-reference">{metric.referenceText}</div>
            ) : (
                <div className="metric-range-list">
                    <span><i className="normal" /><b>Normal</b><em>{metric.normalRange}</em></span>
                    <span><i className="warning" /><b>Advertencia</b><em>{metric.warningRange}</em></span>
                    <span><i className="degraded" /><b>Alto</b><em>{metric.degradedRange}</em></span>
                    <span><i className="critical" /><b>Crítico</b><em>{metric.criticalRange}</em></span>
                </div>
            )}
            <p>{metric.help}</p>
            <span className="metric-source mono">FUENTE: {metric.source}</span>
        </article>
    );
}

function CategoryDetail({ cliente, categoryKey }) {
    const definition = metricDefinitions[categoryKey];
    const score = cliente.scores[categoryKey];
    const status = getScoreStatus(score);
    const totals = definition.metrics.reduce((accumulator, metric) => {
        if (!metric.reference) accumulator[getMetricStatus(metric, cliente.values[metric.key])] += 1;
        return accumulator;
    }, { normal: 0, warning: 0, degraded: 0, critical: 0 });
    return (
        <div className="category-detail">
            <div className={`category-summary status-${status}`}>
                <div><span className="detail-eyebrow mono">{definition.code} · PESO {MONITOR_WEIGHTS[categoryKey] * 100}%</span><strong>{score}<small>/100</small></strong><p>{definition.description}</p></div>
                <TrafficLight status={status} />
                <div className="category-counts">
                    {Object.entries(totals).map(([key, total]) => <span key={key}><i className={`legend-dot ${key}`} /><b>{total}</b>{metricStatusLabel[key]}</span>)}
                </div>
            </div>
            <div className="oracle-source-banner"><span>Vistas Oracle utilizadas</span><b className="mono">{definition.source}</b></div>
            <div className="metric-grid">{definition.metrics.map((metric) => <MetricCard key={metric.key} metric={metric} value={cliente.values[metric.key]} />)}</div>
        </div>
    );
}

function MonitorTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    return <div className="monitor-tooltip"><strong>{payload[0].payload.nombre}</strong><span>ISBD: {payload[0].value}/100</span><small>Estado real: {statusInfo[payload[0].payload.status].label}</small></div>;
}

function HistoryTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return <div className="monitor-tooltip"><strong>{label}</strong><span>ISBD: {payload[0].value}/100</span></div>;
}

export default function Monitoreo() {
    const [selectedClient, setSelectedClient] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('indice');
    const chartData = useMemo(() => clientesMonitoreo.map((cliente) => ({
        nombre: cliente.nombre.replace('Cliente ', 'C'), indice: getHealthScore(cliente), status: getClientStatus(cliente),
    })), []);
    const totals = useMemo(() => clientesMonitoreo.reduce((accumulator, cliente) => {
        accumulator[getClientStatus(cliente)] += 1; return accumulator;
    }, { optimal: 0, healthy: 0, warning: 0, degraded: 0, critical: 0 }), []);
    const openClient = (cliente, category) => {
        setSelectedClient(cliente); setSelectedCategory(category);
        window.setTimeout(() => document.getElementById('monitor-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    };
    return (
        <div className="monitor-page">
            <header className="monitor-page-header">
                <div><span className="monitor-kicker mono">ORACLE DATABASE · TIEMPO REAL</span><h1>Monitor de Salud de Oracle</h1><p>Datos técnicos → indicadores → análisis → ISBD → alertas → decisión.</p></div>
                <div className="monitor-header-actions"><StatusLegend /><span className="monitor-live-badge mono"><i /> ACTUALIZACIÓN ACTIVA</span></div>
            </header>
            <section className="monitor-hero-grid">
                <div className="monitor-chart-card">
                    <div className="monitor-section-title"><div><span className="mono">COMPARATIVO</span><h2>ISBD por cliente</h2></div><small>0.30(IP) + 0.35(IM) + 0.35(IA)</small></div>
                    <div className="health-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}><CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} /><Tooltip content={<MonitorTooltip />} cursor={{ fill: 'rgba(180, 144, 255, 0.05)' }} /><Bar dataKey="indice" radius={[6, 6, 2, 2]} maxBarSize={42}>{chartData.map((entry) => <Cell key={entry.nombre} fill={statusInfo[entry.status].color} />)}</Bar></BarChart></ResponsiveContainer></div>
                </div>
                <div className="monitor-summary-card">
                    <div className="monitor-section-title"><div><span className="mono">RESUMEN</span><h2>Estado real de la red</h2></div><b>{clientesMonitoreo.length}</b></div>
                    <p className="summary-caption">Instancias conectadas</p>
                    <div className="summary-statuses">{Object.entries(totals).map(([key, total]) => <div key={key} className={`summary-status ${key}`}><TrafficLight status={key} compact /><span><strong>{total}</strong><small>{statusInfo[key].label}</small></span></div>)}</div>
                    <div className="summary-progress" aria-hidden="true">{Object.entries(totals).map(([key, total]) => <i key={key} className={key} style={{ width: `${(total / clientesMonitoreo.length) * 100}%` }} />)}</div>
                </div>
            </section>
            <section className="clients-section">
                <div className="monitor-section-title clients-title"><div><span className="mono">INSTANCIAS</span><h2>Clientes monitoreados</h2></div><small>Selecciona un cliente o indicador para ampliar</small></div>
                <div className="monitor-client-grid">{clientesMonitoreo.map((cliente) => <ClientCard key={cliente.id} cliente={cliente} onOpen={openClient} />)}</div>
            </section>
            {selectedClient && (
                <section id="monitor-detail" className="monitor-detail-panel">
                    <header className="monitor-detail-header">
                        <div><button className="detail-back" onClick={() => setSelectedClient(null)}>← Volver a clientes</button><span className="detail-instance mono">{selectedClient.instancia} · {selectedClient.ubicacion}</span><h2>{selectedClient.nombre}</h2></div>
                        <div className="detail-tabs" role="tablist"><button className={selectedCategory === 'indice' ? 'active' : ''} onClick={() => setSelectedCategory('indice')}>ISBD</button>{Object.entries(metricDefinitions).map(([key, definition]) => <button key={key} className={selectedCategory === key ? 'active' : ''} onClick={() => setSelectedCategory(key)}>{definition.code} · {definition.label}</button>)}</div>
                        <button className="detail-close" aria-label="Cerrar detalle" onClick={() => setSelectedClient(null)}>×</button>
                    </header>
                    {selectedCategory === 'indice' ? <OverviewDetail cliente={selectedClient} onSelectCategory={setSelectedCategory} /> : <CategoryDetail cliente={selectedClient} categoryKey={selectedCategory} />}
                </section>
            )}
        </div>
    );
}