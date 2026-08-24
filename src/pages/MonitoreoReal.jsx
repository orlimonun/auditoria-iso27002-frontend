import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getEstadoOracle, getSaludOracle } from '../api/monitoreoOracle';
import '../styles/monitoreo.css';

const statusInfo = {
    optimal: { label: 'Óptimo', color: '#22c55e' }, healthy: { label: 'Saludable', color: '#4ade80' },
    warning: { label: 'Advertencia', color: '#fbbf24' }, degraded: { label: 'Degradado', color: '#fb923c' },
    critical: { label: 'Crítico', color: '#f87171' }, normal: { label: 'Normal', color: '#4ade80' },
};
const metricStatusLabel = { normal: 'Normal', warning: 'Advertencia', degraded: 'Alto', critical: 'Crítico' };
const COMPONENTS = {
    Procesos: { code: 'IP', weight: 30, description: 'Actividad, sesiones, bloqueos y procesos activos de Oracle.', source: 'V$SESSION · V$PROCESS' },
    Memoria: { code: 'IM', weight: 35, description: 'Uso de la SGA y eficiencia del buffer cache.', source: 'V$SGASTAT · V$SYSSTAT' },
    Archivos: { code: 'IA', weight: 35, description: 'Capacidad de tablespaces y disponibilidad de datafiles.', source: 'DBA_TABLESPACES · DBA_DATA_FILES · V$DATAFILE' },
};

// Estos labels deben coincidir con SaludOracleDTO.metricas del backend.
const METRIC_DEFS = {
    'Sesiones totales': { max: 500, direction: 'higher', warning: 345, degraded: 425, critical: 475, ranges: ['0–344', '345–424', '425–474', '475+'], source: 'V$SESSION', help: 'Total de sesiones conectadas a la instancia.' },
    'Sesiones activas': { max: 100, direction: 'higher', warning: 70, degraded: 85, critical: 95, ranges: ['0–69', '70–84', '85–94', '95+'], source: 'V$SESSION', help: 'Sesiones que están ejecutando actividad.' },
    'Sesiones inactivas': { max: 100, direction: 'higher', warning: 70, degraded: 85, critical: 95, ranges: ['0–69', '70–84', '85–94', '95+'], source: 'V$SESSION', help: 'Sesiones conectadas que no ejecutan actividad.' },
    'Sesiones bloqueadas': { max: 8, direction: 'higher', warning: 1, degraded: 3, critical: 5, ranges: ['0', '1–2', '3–4', '5+'], source: 'V$SESSION', help: 'Sesiones que esperan por un bloqueo.' },
    Procesos: { max: 300, direction: 'higher', warning: 208, degraded: 255, critical: 285, ranges: ['0–207', '208–254', '255–284', '285+'], source: 'V$PROCESS', help: 'Procesos Oracle activos.' },
    'SGA total (MB)': { reference: true, unit: ' MB', source: 'V$SGASTAT', help: 'Tamaño total de la memoria compartida.' },
    'SGA libre (MB)': { reference: true, unit: ' MB', source: 'V$SGASTAT', help: 'Memoria libre dentro de la SGA.' },
    'Uso de SGA (%)': { max: 100, direction: 'higher', warning: 80, degraded: 90, critical: 95, ranges: ['0–79', '80–89', '90–94', '95+'], unit: '%', source: 'V$SGASTAT', help: 'Porcentaje de la SGA actualmente en uso.' },
    'Buffer cache hit (%)': { max: 100, direction: 'lower', warning: 90, degraded: 85, critical: 80, ranges: ['90–100', '85–89', '80–84', '<80'], unit: '%', source: 'V$SYSSTAT', help: 'Lecturas atendidas desde memoria sin ir a disco.' },
    Tablespaces: { reference: true, source: 'DBA_TABLESPACES', help: 'Cantidad total de tablespaces.' },
    'Max uso tablespace (%)': { max: 100, direction: 'higher', warning: 80, degraded: 85, critical: 90, ranges: ['0–79', '80–84', '85–89', '90+'], unit: '%', source: 'DBA_DATA_FILES', help: 'Ocupación del tablespace con mayor uso.' },
    'Datafiles online': { reference: true, source: 'V$DATAFILE', help: 'Datafiles que se encuentran operativos.' },
    'Datafiles con problema': { max: 5, direction: 'higher', warning: 1, degraded: 2, critical: 3, ranges: ['0', '1', '2', '3+'], source: 'V$DATAFILE', help: 'Datafiles fuera de línea o con problemas.' },
};

function normalizeStatus(value, fallback = 'normal') {
    const normalized = String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const aliases = { optimo: 'optimal', saludable: 'healthy', advertencia: 'warning', degradado: 'degraded', alto: 'degraded', critico: 'critical', normal: 'normal' };
    const status = aliases[normalized] || normalized;
    return statusInfo[status] ? status : fallback;
}
function scoreStatus(score) {
    if (score < 40) return 'critical';
    if (score < 60) return 'degraded';
    if (score < 75) return 'warning';
    if (score >= 90) return 'optimal';
    return 'healthy';
}

function connectionState(response, requestFailed = false) {
    if (requestFailed) return { status: 'unknown', label: 'ESTADO NO DISPONIBLE' };
    if (response == null) return { status: 'unknown', label: 'ESTADO NO DISPONIBLE' };
    const rawValue = response?.conectado ?? response?.disponible ?? response?.online
        ?? response?.estado ?? response?.status ?? response?.mensaje ?? response?.error ?? response;
    if (typeof rawValue === 'boolean') {
        return rawValue
            ? { status: 'online', label: 'ORACLE CONECTADO' }
            : { status: 'offline', label: 'ORACLE DESCONECTADO' };
    }
    const normalized = String(rawValue ?? '').trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const isOffline = ['false', 'down', 'offline', 'desconectado', 'no disponible', 'error', 'cerrado'].some((value) => normalized.includes(value));
    return isOffline
        ? { status: 'offline', label: 'ORACLE DESCONECTADO' }
        : { status: 'online', label: 'ORACLE CONECTADO' };
}
function metricStatus(metric) {
    const fromBackend = normalizeStatus(metric.estado, '');
    if (fromBackend) return fromBackend;
    const def = METRIC_DEFS[metric.label];
    if (!def || def.reference) return 'normal';
    const value = Number(metric.valor);
    if (def.direction === 'lower') {
        if (value < def.critical) return 'critical';
        if (value < def.degraded) return 'degraded';
        if (value < def.warning) return 'warning';
        return 'normal';
    }
    if (value >= def.critical) return 'critical';
    if (value >= def.degraded) return 'degraded';
    if (value >= def.warning) return 'warning';
    return 'normal';
}
function scaleBackground(def) {
    if (def.reference) return 'linear-gradient(90deg, var(--violet), var(--blue))';
    if (def.direction === 'lower') {
        const c = (def.critical / def.max) * 100, d = (def.degraded / def.max) * 100, w = (def.warning / def.max) * 100;
        return `linear-gradient(90deg, var(--monitor-critical) 0 ${c}%, var(--monitor-degraded) ${c}% ${d}%, var(--monitor-warning) ${d}% ${w}%, var(--monitor-normal) ${w}% 100%)`;
    }
    const w = (def.warning / def.max) * 100, d = (def.degraded / def.max) * 100, c = (def.critical / def.max) * 100;
    return `linear-gradient(90deg, var(--monitor-normal) 0 ${w}%, var(--monitor-warning) ${w}% ${d}%, var(--monitor-degraded) ${d}% ${c}%, var(--monitor-critical) ${c}% 100%)`;
}

function TrafficLight({ status, compact = false }) {
    const safeStatus = normalizeStatus(status);
    const activeLamp = ['optimal', 'healthy', 'normal'].includes(safeStatus) ? 'green' : safeStatus === 'warning' ? 'yellow' : 'red';
    return <span className={`monitor-traffic ${compact ? 'compact' : ''}`} aria-label={`Estado ${statusInfo[safeStatus].label}`}>
        {['red', 'yellow', 'green'].map((lamp) => <span key={lamp} className={`monitor-traffic-light ${activeLamp === lamp ? 'is-active' : ''}`} style={activeLamp === lamp ? { '--lamp-color': statusInfo[safeStatus].color } : undefined} />)}
    </span>;
}
function HealthRing({ score, status, size = '' }) {
    const safeScore = Math.max(0, Math.min(Number(score) || 0, 100));
    const safeStatus = normalizeStatus(status, scoreStatus(safeScore));
    return <div className={`health-ring ${size}`} style={{ '--score': `${safeScore * 3.6}deg`, '--ring-color': statusInfo[safeStatus].color }}><div className="health-ring-center"><strong>{safeScore}</strong><span>/100</span></div></div>;
}
function StatusLegend() {
    return <div className="monitor-legend" aria-label="Escala del ISBD">{['optimal', 'healthy', 'warning', 'degraded', 'critical'].map((status) => <span key={status}><i className={`legend-dot ${status}`} />{statusInfo[status].label}</span>)}</div>;
}

function CompanyCard({ companyName, databaseName, health, scores, globalStatus, oracleState, lastUpdated, onOpen }) {
    const indicators = [
        { key: 'indice', label: 'ISBD · Índice global', score: Number(health.isbd) || 0, status: globalStatus },
        ...Object.entries(COMPONENTS).map(([key, definition]) => ({
            key, label: `${definition.code} · ${key}`, score: scores[key], status: scoreStatus(scores[key]),
        })),
    ];
    return (
        <article className={`monitor-client-card status-${globalStatus}`} role="button" tabIndex={0}
                 onClick={() => onOpen('indice')}
                 onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpen('indice'); }}>
            <header className="client-card-head">
                <div>
                    <span className={`client-live ${oracleState.status}`}><i /> {oracleState.label}</span>
                    <h2>{companyName}</h2>
                    <p className="mono">{databaseName}</p>
                </div>
                <HealthRing score={health.isbd} status={globalStatus} size="small" />
            </header>
            <div className="client-alert-summary">
                <span className={`state-pill ${globalStatus}`}>{statusInfo[globalStatus].label}</span>
                <small>1 base de datos Oracle</small>
            </div>
            <div className="client-indicators">
                {indicators.map((indicator) => (
                    <button key={indicator.key} className={`client-indicator indicator-${indicator.status}`}
                            onClick={(event) => { event.stopPropagation(); onOpen(indicator.key); }}>
                        <TrafficLight status={indicator.status} compact />
                        <span><small>{indicator.label}</small><strong>{indicator.score}<em>/100</em></strong></span>
                        <b aria-hidden="true">›</b>
                    </button>
                ))}
            </div>
            <footer className="client-card-foot">
                <span>Oracle Database</span>
                <span className="mono">↻ {lastUpdated?.toLocaleTimeString('es-CR') || '—'}</span>
            </footer>
        </article>
    );
}

function MonitorTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    return <div className="monitor-tooltip"><strong>{payload[0].payload.nombre}</strong><span>ISBD: {payload[0].value}/100</span><small>{statusInfo[payload[0].payload.status].label}</small></div>;
}
function IndicatorCard({ component, score, selected, onClick, metricCount }) {
    const def = COMPONENTS[component], status = scoreStatus(score);
    return <button className={`real-indicator-card status-${status} ${selected ? 'is-selected' : ''}`} onClick={onClick}>
        <div className="real-indicator-heading"><TrafficLight status={status} compact /><span><small>{def.code} · PESO {def.weight}%</small><strong>{component}</strong></span><b>{score}<em>/100</em></b></div>
        <div className="overview-category-bar"><i style={{ width: `${score}%` }} /></div><p>{def.description}</p>
        <span className="category-link"><span>{metricCount} métricas reales</span><b>Ver detalle →</b></span>
    </button>;
}
function MetricCard({ metric }) {
    const def = METRIC_DEFS[metric.label] || { reference: true, source: 'ORACLE', help: 'Métrica informada por Oracle.' };
    const status = def.reference ? 'normal' : metricStatus(metric), value = Number(metric.valor);
    const progress = def.max ? Math.max(0, Math.min((value / def.max) * 100, 100)) : 100;
    return <article className={`metric-card status-${status}`}>
        <header><div><span className="metric-status"><i />{def.reference ? 'Referencia' : metricStatusLabel[status]}</span><h4>{metric.label}</h4></div><TrafficLight status={status} compact /></header>
        <div className="metric-current"><strong>{metric.valor}</strong><span>{def.unit || ''}</span></div>
        <div className="metric-scale" style={{ background: scaleBackground(def) }}><i style={{ width: `${progress}%` }} /><b style={{ left: `${progress}%` }} /></div>
        {def.reference ? <div className="metric-reference">Valor informativo de la instancia</div> : <div className="metric-range-list">{['normal', 'warning', 'degraded', 'critical'].map((rangeStatus, index) => <span key={rangeStatus}><i className={rangeStatus} /><b>{metricStatusLabel[rangeStatus]}</b><em>{def.ranges[index]}</em></span>)}</div>}
        <p>{def.help}</p><span className="metric-source mono">FUENTE: {def.source}</span>
    </article>;
}
function AlertsPanel({ metrics, onSelectComponent }) {
    const order = { critical: 0, degraded: 1, warning: 2 };
    const alerts = metrics.filter((metric) => !METRIC_DEFS[metric.label]?.reference && metricStatus(metric) !== 'normal').sort((a, b) => order[metricStatus(a)] - order[metricStatus(b)]);
    return <section className="monitor-alerts-panel real-alerts-panel"><div className="overview-intro"><div><span className="detail-eyebrow mono">ALERTAS ACTIVAS</span><h3>Problemas que no debe ocultar el índice</h3></div><p>Fecha y hora: ahora · actualización en vivo</p></div>
        {alerts.length === 0 ? <div className="alert-empty"><i className="legend-dot healthy" /> Todos los componentes se encuentran dentro de los rangos normales.</div> : <div className="alert-list">{alerts.map((metric, index) => {
            const status = metricStatus(metric), def = METRIC_DEFS[metric.label];
            return <button key={`${metric.label}-${index}`} className={`monitor-alert status-${status}`} onClick={() => onSelectComponent(metric.componente)}><i className={`legend-dot ${status}`} /><span><strong>{metric.label}</strong><small>{metric.componente} · valor {metric.valor}{def?.unit || ''}</small></span><span className="alert-threshold"><small>Rango normal</small><b>{def?.ranges?.[0] || 'Backend'}</b></span><em>{metricStatusLabel[status]}</em></button>;
        })}</div>}
    </section>;
}
function HistoryTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return <div className="monitor-tooltip"><strong>{label}</strong><span>ISBD: {payload[0].value}/100</span></div>;
}

export default function MonitoreoReal() {
    const [health, setHealth] = useState(null), [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(''), [history, setHistory] = useState([]), [selectedComponent, setSelectedComponent] = useState('Procesos');
    const [detailView, setDetailView] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [oracleConnection, setOracleConnection] = useState(null);
    const [connectionRequestFailed, setConnectionRequestFailed] = useState(false);
    const loadHealth = useCallback(async (manual = false) => {
        if (manual) setRefreshing(true);
        try {
            const [connectionResult, healthResult] = await Promise.allSettled([
                getEstadoOracle(),
                getSaludOracle(),
            ]);
            setConnectionRequestFailed(connectionResult.status === 'rejected');
            setOracleConnection(connectionResult.status === 'fulfilled' ? connectionResult.value : null);
            if (healthResult.status === 'rejected') throw healthResult.reason;
            const data = healthResult.value, now = new Date();
            setHealth(data); setError(''); setLastUpdated(now);
            setHistory((previous) => [...previous, { hora: now.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), isbd: Number(data.isbd) || 0 }].slice(-12));
        } catch (requestError) { setError(requestError.message || 'No se pudo consultar la salud de Oracle.'); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);
    useEffect(() => { loadHealth(); const interval = window.setInterval(loadHealth, 15000); return () => window.clearInterval(interval); }, [loadHealth]);
    const metrics = health?.metricas || [];
    const metricsByComponent = useMemo(() => Object.keys(COMPONENTS).reduce((groups, component) => ({ ...groups, [component]: metrics.filter((metric) => metric.componente === component) }), {}), [metrics]);

    if (loading) return <div className="monitor-state-card"><span className="monitor-loader" /><h2>Conectando con Oracle</h2><p>Consultando las vistas de rendimiento…</p></div>;
    if (!health) return <div className="monitor-state-card is-error"><h2>No fue posible leer Oracle</h2><p>{error || 'El backend no devolvió datos.'}</p><button className="monitor-refresh-button" onClick={() => loadHealth(true)}>Reintentar conexión</button></div>;

    const scores = { Procesos: Number(health.ip) || 0, Memoria: Number(health.im) || 0, Archivos: Number(health.ia) || 0 };
    const backendStatus = normalizeStatus(health.estado, scoreStatus(health.isbd));
    const hasCritical = metrics.some((metric) => !METRIC_DEFS[metric.label]?.reference && metricStatus(metric) === 'critical');
    const globalStatus = hasCritical ? 'critical' : backendStatus, selectedDef = COMPONENTS[selectedComponent];
    const selectedMetrics = metricsByComponent[selectedComponent] || [], selectedStatus = scoreStatus(scores[selectedComponent]);
    const statusCounts = selectedMetrics.reduce((counts, metric) => { if (!METRIC_DEFS[metric.label]?.reference) counts[metricStatus(metric)] += 1; return counts; }, { normal: 0, warning: 0, degraded: 0, critical: 0 });
    const oracleState = connectionState(oracleConnection, connectionRequestFailed);
    const companyName = 'NovaTech Solutions S.A.';
    const databaseName = 'ORCL-PROD-01';
    // El frontend ya trabaja como una colección. Hoy contiene un cliente;
    // cuando el backend entregue más, se agregan a este arreglo sin cambiar la vista.
    const monitoredClients = [{
        id: 'oracle-1', companyName, databaseName, health, scores,
        globalStatus, oracleState, lastUpdated,
    }];
    const chartData = monitoredClients.map((client, index) => ({
        nombre: `C${index + 1}`,
        cliente: client.companyName,
        indice: Number(client.health.isbd) || 0,
        status: client.globalStatus,
    }));
    const statusTotals = monitoredClients.reduce((totals, client) => {
        totals[client.globalStatus] += 1;
        return totals;
    }, { optimal: 0, healthy: 0, warning: 0, degraded: 0, critical: 0 });
    const openDetail = (view) => {
        if (view !== 'indice') setSelectedComponent(view);
        setDetailView(view);
        window.setTimeout(() => document.getElementById('monitor-real-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    };

    return (
        <div className="monitor-page">
            <header className="monitor-page-header">
                <div><span className="monitor-kicker mono">ORACLE DATABASE · TIEMPO REAL</span><h1>Monitor de Salud de Oracle</h1><p>Datos técnicos → indicadores → análisis → ISBD → alertas → decisión.</p></div>
                <div className="monitor-header-actions"><StatusLegend /><span className="monitor-live-badge mono"><i /> ACTUALIZACIÓN ACTIVA</span></div>
            </header>

            {error && <div className="monitor-stale-warning">La última actualización falló: {error}. Se conservan los datos anteriores.</div>}

            <section className="monitor-hero-grid">
                <div className="monitor-chart-card">
                    <div className="monitor-section-title"><div><span className="mono">COMPARATIVO</span><h2>ISBD por cliente</h2></div><small>0.30(IP) + 0.35(IM) + 0.35(IA)</small></div>
                    <div className="health-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}><CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} /><Tooltip content={<MonitorTooltip />} cursor={{ fill: 'rgba(180, 144, 255, 0.05)' }} /><Bar dataKey="indice" radius={[6, 6, 2, 2]} maxBarSize={54}><Cell fill={statusInfo[globalStatus].color} /></Bar></BarChart></ResponsiveContainer></div>
                </div>
                <div className="monitor-summary-card">
                    <div className="monitor-section-title"><div><span className="mono">RESUMEN</span><h2>Estado real de la red</h2></div><b>{monitoredClients.length}</b></div>
                    <p className="summary-caption">Instancias conectadas</p>
                    <div className="summary-statuses">{Object.entries(statusTotals).map(([status, total]) => <div key={status} className={`summary-status ${status}`}><TrafficLight status={status} compact /><span><strong>{total}</strong><small>{statusInfo[status].label}</small></span></div>)}</div>
                    <div className="summary-progress">{Object.entries(statusTotals).map(([status, total]) => total > 0 && <i key={status} className={status} style={{ width: `${(total / monitoredClients.length) * 100}%` }} />)}</div>
                </div>
            </section>

            <section className="clients-section">
                <div className="monitor-section-title clients-title"><div><span className="mono">INSTANCIAS</span><h2>Clientes monitoreados</h2></div><small>Selecciona un cliente o indicador para ampliar</small></div>
                <div className="monitor-client-grid">
                    {monitoredClients.map((client) => <CompanyCard key={client.id} companyName={client.companyName} databaseName={client.databaseName} health={client.health} scores={client.scores} globalStatus={client.globalStatus} oracleState={client.oracleState} lastUpdated={client.lastUpdated} onOpen={openDetail} />)}
                </div>
            </section>

            {detailView && (
                <section id="monitor-real-detail" className="monitor-detail-panel">
                    <header className="monitor-detail-header">
                        <div><button className="detail-back" onClick={() => setDetailView(null)}>← Volver a empresa</button><span className="detail-instance mono">{databaseName} · DATOS REALES</span><h2>{companyName}</h2></div>
                        <div className="detail-tabs" role="tablist"><button className={detailView === 'indice' ? 'active' : ''} onClick={() => setDetailView('indice')}>ISBD</button>{Object.entries(COMPONENTS).map(([component, definition]) => <button key={component} className={detailView === component ? 'active' : ''} onClick={() => { setSelectedComponent(component); setDetailView(component); }}>{definition.code} · {component}</button>)}</div>
                        <button className="detail-close" aria-label="Cerrar detalle" onClick={() => setDetailView(null)}>×</button>
                    </header>

                    {detailView === 'indice' ? (
                        <div className="monitor-overview-wrapper">
                            <div className="monitor-overview-detail">
                                <section className="overview-score-panel">
                                    <span className="detail-eyebrow mono">ISBD · ÍNDICE GLOBAL</span>
                                    <HealthRing score={health.isbd} status={globalStatus} />
                                    <strong className={`status-text ${globalStatus}`}>ESTADO REAL: {statusInfo[globalStatus].label}</strong>
                                    {hasCritical && backendStatus !== 'critical' && <p className="critical-override">Una métrica crítica prevalece sobre el promedio.</p>}
                                    <p className="health-formula mono">0.30(IP) + 0.35(IM) + 0.35(IA)</p>
                                </section>
                                <section className="overview-categories">
                                    <div className="overview-intro">
                                        <div><span className="detail-eyebrow mono">INDICADORES PONDERADOS</span><h3>Procesos, memoria y archivos</h3></div>
                                        <p>Selecciona un componente para consultar variables, umbrales y fuentes Oracle.</p>
                                    </div>
                                    <div className="overview-category-grid">
                                        {Object.entries(COMPONENTS).map(([component, definition]) => {
                                            const componentScore = scores[component];
                                            const componentStatus = scoreStatus(componentScore);
                                            const alertCount = (metricsByComponent[component] || []).filter((metric) => !METRIC_DEFS[metric.label]?.reference && metricStatus(metric) !== 'normal').length;
                                            return <button key={component} className={`overview-category status-${componentStatus}`} onClick={() => openDetail(component)}>
                                                <div className="overview-category-title"><TrafficLight status={componentStatus} compact /><span><small>{definition.code} · peso {definition.weight}%</small><strong>{componentScore}/100</strong></span></div>
                                                <div className="overview-category-bar"><i style={{ width: `${componentScore}%` }} /></div>
                                                <p>{alertCount === 0 ? 'Todas las variables normales' : `${alertCount} ${alertCount === 1 ? 'variable requiere' : 'variables requieren'} atención`}</p>
                                                <span className="category-link"><span>Ver {component.toLowerCase()}</span><b>→</b></span>
                                            </button>;
                                        })}
                                    </div>
                                </section>
                            </div>
                            <AlertsPanel metrics={metrics} onSelectComponent={(component) => COMPONENTS[component] && openDetail(component)} />
                            <section className="monitor-history-panel"><div className="overview-intro"><div><span className="detail-eyebrow mono">EVOLUCIÓN DE LA SESIÓN</span><h3>ISBD en las últimas 12 lecturas</h3></div><p>Se actualiza con cada consulta real.</p></div><div className="history-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={history} margin={{ top: 8, right: 18, left: -20, bottom: 0 }}><CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} /><Tooltip content={<HistoryTooltip />} /><Line type="monotone" dataKey="isbd" stroke={statusInfo[globalStatus].color} strokeWidth={3} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div></section>
                        </div>
                    ) : (
                        <div className="category-detail"><div className={`category-summary status-${selectedStatus}`}><div><span className="detail-eyebrow mono">{selectedDef.code} · PESO {selectedDef.weight}%</span><strong>{scores[selectedComponent]}<small>/100</small></strong><p>{selectedDef.description}</p></div><TrafficLight status={selectedStatus} /><div className="category-counts">{Object.entries(statusCounts).map(([status, total]) => <span key={status}><i className={`legend-dot ${status}`} /><b>{total}</b>{metricStatusLabel[status]}</span>)}</div></div><div className="oracle-source-banner"><span>Vistas Oracle utilizadas</span><b className="mono">{selectedDef.source}</b></div>{selectedMetrics.length ? <div className="metric-grid">{selectedMetrics.map((metric, index) => <MetricCard key={`${metric.label}-${index}`} metric={metric} />)}</div> : <div className="alert-empty">El backend no devolvió métricas para {selectedComponent}.</div>}</div>
                    )}
                </section>
            )}
        </div>
    );
}