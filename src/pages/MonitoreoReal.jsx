import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getEstadoOracle, getInstanciasOracle } from '../api/monitoreoOracle';
import '../styles/monitoreo.css';

const statusInfo = {
    optimal: { label: 'Óptimo', color: '#22c55e' }, healthy: { label: 'Saludable', color: '#4ade80' },
    warning: { label: 'Advertencia', color: '#fbbf24' }, degraded: { label: 'Degradado', color: '#fb923c' },
    critical: { label: 'Crítico', color: '#f87171' }, normal: { label: 'Normal', color: '#4ade80' },
    unknown: { label: 'Sin datos', color: '#94a3b8' },
};
const metricStatusLabel = { normal: 'Normal', warning: 'Advertencia', degraded: 'Alto', critical: 'Crítico' };

// Los cuatro componentes del ISBD.
// Recuperación solo lo reportan las instancias que lo tienen: en Autonomous
// llega en 100 porque Oracle garantiza el archivado y no es administrable.
const COMPONENTS = {
    Procesos: { code: 'IP', weight: 20, description: 'Sesiones, bloqueos y cercanía al límite de procesos de la instancia.', source: 'V$SESSION · V$PROCESS · V$RESOURCE_LIMIT' },
    Memoria: { code: 'IM', weight: 30, description: 'Uso de la SGA y eficiencia del buffer cache.', source: 'V$SGASTAT · V$SYSSTAT' },
    Archivos: { code: 'IA', weight: 30, description: 'Ocupación de tablespaces, datafiles y distribución física del esquema.', source: 'DBA_TABLESPACE_USAGE_METRICS · V$DATAFILE · DBA_SEGMENTS' },
    Recuperacion: { code: 'IR', weight: 20, description: 'Modo de archivado, multiplexado de bitácoras y área de recuperación.', source: 'V$DATABASE · V$LOG · V$LOGFILE · V$RECOVERY_AREA_USAGE' },
};
const COMPONENT_LABEL = { Procesos: 'Procesos', Memoria: 'Memoria', Archivos: 'Archivos', Recuperacion: 'Recuperación' };
const FORMULA = '0.20(IP) + 0.30(IM) + 0.30(IA) + 0.20(IR)';

// Estos labels deben coincidir con SaludOracleDTO.metricas del backend.
const METRIC_DEFS = {
    // ---- Procesos ----
    'Sesiones totales': { max: 500, direction: 'higher', warning: 345, degraded: 425, critical: 475, ranges: ['0–344', '345–424', '425–474', '475+'], source: 'V$SESSION', help: 'Total de sesiones conectadas a la instancia.' },
    'Sesiones activas': { max: 100, direction: 'higher', warning: 70, degraded: 85, critical: 95, ranges: ['0–69', '70–84', '85–94', '95+'], source: 'V$SESSION', help: 'Sesiones que están ejecutando actividad.' },
    'Sesiones inactivas': { max: 100, direction: 'higher', warning: 70, degraded: 85, critical: 95, ranges: ['0–69', '70–84', '85–94', '95+'], source: 'V$SESSION', help: 'Sesiones conectadas que no ejecutan actividad.' },
    'Sesiones bloqueadas': { max: 8, direction: 'higher', warning: 1, degraded: 3, critical: 5, ranges: ['0', '1–2', '3–4', '5+'], source: 'V$SESSION', help: 'Sesiones que esperan por un bloqueo de otra.' },
    Procesos: { max: 300, direction: 'higher', warning: 208, degraded: 255, critical: 285, ranges: ['0–207', '208–254', '255–284', '285+'], source: 'V$PROCESS', help: 'Procesos Oracle activos en este momento.' },
    'Pico de procesos': { reference: true, source: 'V$RESOURCE_LIMIT', help: 'Mayor cantidad simultánea desde que arrancó la instancia. Revela picos que un muestreo periódico no alcanza a ver.' },
    'Uso del limite de procesos (%)': { max: 100, direction: 'higher', warning: 75, degraded: 85, critical: 90, ranges: ['0–74', '75–84', '85–89', '90+'], unit: '%', source: 'V$RESOURCE_LIMIT', help: 'Qué tan cerca está del máximo configurado. Al agotarse, Oracle rechaza toda conexión nueva con ORA-00020 aunque el servidor tenga recursos libres.' },

    // ---- Memoria ----
    'SGA total (MB)': { reference: true, unit: ' MB', source: 'V$SGASTAT', help: 'Tamaño total de la memoria compartida de la instancia.' },
    'SGA libre (MB)': { reference: true, unit: ' MB', source: 'V$SGASTAT', help: 'Memoria aún disponible dentro de la SGA.' },
    'Uso de SGA (%)': { max: 100, direction: 'higher', warning: 80, degraded: 90, critical: 95, ranges: ['0–79', '80–89', '90–94', '95+'], unit: '%', source: 'V$SGASTAT', help: 'Porcentaje de la SGA actualmente en uso.' },
    'Buffer cache hit (%)': { max: 100, direction: 'lower', warning: 90, degraded: 85, critical: 80, ranges: ['90–100', '85–89', '80–84', '<80'], unit: '%', source: 'V$SYSSTAT', help: 'Proporción de lecturas resueltas en memoria sin ir al disco. Es la diferencia entre consistent gets y physical reads.' },

    // ---- Archivos ----
    Tablespaces: { reference: true, source: 'DBA_TABLESPACE_USAGE_METRICS', help: 'Cantidad total de tablespaces de la base.' },
    'Max uso tablespace (%)': { max: 100, direction: 'higher', warning: 80, degraded: 85, critical: 90, ranges: ['0–79', '80–84', '85–89', '90+'], unit: '%', source: 'DBA_TABLESPACE_USAGE_METRICS', help: 'Ocupación del tablespace más lleno. Si uno se agota, toda operación que necesite crecer falla.' },
    'Datafiles online': { reference: true, source: 'V$DATAFILE', help: 'Datafiles que se encuentran operativos.' },
    'Datafiles con problema': { max: 5, direction: 'higher', warning: 1, degraded: 2, critical: 3, ranges: ['0', '1', '2', '3+'], source: 'V$DATAFILE', help: 'Datafiles fuera de línea o con problemas.' },
    'Tablespaces usados por el esquema': { reference: true, source: 'DBA_SEGMENTS', help: 'Entre cuántos tablespaces está repartido el esquema. Uno solo significa que no hay distribución de I/O.' },
    'Segmentos aun en USERS': { max: 20, direction: 'higher', warning: 1, degraded: 5, critical: 10, ranges: ['0', '1–4', '5–9', '10+'], source: 'DBA_SEGMENTS', help: 'Objetos que siguen en el tablespace por defecto, sin distribuir.' },
    'Claves foraneas sin indice': { max: 10, direction: 'higher', warning: 1, degraded: 3, critical: 5, ranges: ['0', '1–2', '3–4', '5+'], source: 'DBA_CONSTRAINTS', help: 'Oracle no crea índices para las claves foráneas. Sin ellos, cada borrado en la tabla padre recorre la tabla hija completa y la bloquea.' },

    // ---- Recuperación ----
    'Modo ARCHIVELOG': { boolean: true, source: 'V$DATABASE', help: 'Sin archivado, el redo se sobrescribe al completar el ciclo de bitácoras y no hay recuperación posible ante un fallo de medios.' },
    'Archivado gestionado por Oracle': { boolean: true, source: 'AUTONOMOUS', help: 'En Autonomous el modo de archivado no es administrable: Oracle lo garantiza por diseño.' },
    'Respaldos automaticos': { boolean: true, source: 'AUTONOMOUS', help: 'Autonomous toma respaldos automáticos sin intervención del administrador.' },
    'Grupos de bitacora': { max: 8, direction: 'lower', warning: 4, degraded: 3, critical: 2, ranges: ['4+', '3', '2', '<2'], source: 'V$LOG', help: 'Con pocos grupos, si el archivador se atrasa la base se detiene a esperar. Oracle exige un mínimo de dos.' },
    'Miembros por grupo (minimo)': { max: 4, direction: 'lower', warning: 2, degraded: 2, critical: 2, ranges: ['2+', '—', '—', '1'], source: 'V$LOG', help: 'Un grupo con un solo miembro es un punto único de falla: si ese archivo se pierde, el grupo queda inservible.' },
    'Grupos sin espejo': { max: 8, direction: 'higher', warning: 1, degraded: 1, critical: 1, ranges: ['0', '—', '—', '1+'], source: 'V$LOG', help: 'Grupos de bitácora que no están multiplexados.' },
    'Miembros danados': { max: 8, direction: 'higher', warning: 1, degraded: 2, critical: 3, ranges: ['0', '1', '2', '3+'], source: 'V$LOGFILE', help: 'Miembros en estado INVALID o STALE. Un INVALID indica que una escritura falló.' },
    'Uso del area de recuperacion (%)': { max: 100, direction: 'higher', warning: 80, degraded: 85, critical: 90, ranges: ['0–79', '80–84', '85–89', '90+'], unit: '%', source: 'V$RECOVERY_AREA_USAGE', help: 'Si el área de recuperación se llena, la base se detiene por completo con ORA-00257.' },
    'Base local inaccesible': { reference: true, source: 'AGENTE', help: 'El agente está vivo pero no pudo leer la base. Es distinto de que el agente haya dejado de reportar.' },
    'Sin contacto con la instancia': { reference: true, source: 'BACKEND', help: 'La lectura directa contra la instancia falló.' },
};

function normalizeStatus(value, fallback = 'normal') {
    const normalized = String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const aliases = { optimo: 'optimal', saludable: 'healthy', advertencia: 'warning', degradado: 'degraded', alto: 'degraded', critico: 'critical', normal: 'normal', desconocido: 'unknown' };
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
function metricStatus(metric) {
    const fromBackend = normalizeStatus(metric.estado, '');
    if (fromBackend && fromBackend !== 'unknown') return fromBackend;
    const def = METRIC_DEFS[metric.label];
    if (!def || def.reference) return 'normal';
    const value = Number(metric.valor);
    if (def.boolean) return value === 1 ? 'normal' : 'critical';
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
    if (def.reference || def.boolean) return 'linear-gradient(90deg, var(--violet), var(--blue))';
    if (def.direction === 'lower') {
        const c = (def.critical / def.max) * 100, d = (def.degraded / def.max) * 100, w = (def.warning / def.max) * 100;
        return `linear-gradient(90deg, var(--monitor-critical) 0 ${c}%, var(--monitor-degraded) ${c}% ${d}%, var(--monitor-warning) ${d}% ${w}%, var(--monitor-normal) ${w}% 100%)`;
    }
    const w = (def.warning / def.max) * 100, d = (def.degraded / def.max) * 100, c = (def.critical / def.max) * 100;
    return `linear-gradient(90deg, var(--monitor-normal) 0 ${w}%, var(--monitor-warning) ${w}% ${d}%, var(--monitor-degraded) ${d}% ${c}%, var(--monitor-critical) ${c}% 100%)`;
}

// ---------------------------------------------------------------------------
// Helpers de instancia
// ---------------------------------------------------------------------------
function scoresDe(inst) {
    const s = { Procesos: Number(inst.ip) || 0, Memoria: Number(inst.im) || 0, Archivos: Number(inst.ia) || 0 };
    if (inst.ir !== null && inst.ir !== undefined) s.Recuperacion = Number(inst.ir) || 0;
    return s;
}
function componentesDe(inst) {
    const s = scoresDe(inst);
    return Object.keys(COMPONENTS).filter((c) => s[c] !== undefined);
}
function tiempoRelativo(segundos) {
    if (segundos === null || segundos === undefined) return '';
    if (segundos < 60) return `${segundos} s`;
    const m = Math.floor(segundos / 60);
    if (m < 60) return `${m} min`;
    return `${Math.floor(m / 60)} h ${m % 60} min`;
}
// Dos fuentes distintas, dos formas de estar caído:
//   directo -> el backend no pudo conectarse a la instancia
//   agente  -> el agente dejó de reportar, o reportó que la base no responde
function conexionDe(inst) {
    if (inst.origen === 'agente') {
        if (!inst.conectado) {
            return { status: 'offline', label: `SIN CONTACTO · HACE ${tiempoRelativo(inst.segundosSinContacto).toUpperCase()}` };
        }
        return { status: 'online', label: `AGENTE ACTIVO · HACE ${tiempoRelativo(inst.segundosSinContacto).toUpperCase()}` };
    }
    return inst.conectado
        ? { status: 'online', label: 'LECTURA DIRECTA' }
        : { status: 'offline', label: 'SIN CONEXIÓN' };
}
function tipoEtiqueta(inst) {
    return inst.tipo === 'autonomous' ? 'AUTONOMOUS · ORACLE CLOUD' : 'TRADICIONAL · ON-PREMISE';
}

// ---------------------------------------------------------------------------
// Piezas visuales
// ---------------------------------------------------------------------------
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
function MonitorTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    return <div className="monitor-tooltip"><strong>{payload[0].payload.cliente}</strong><span>ISBD: {payload[0].value}/100</span><small>{statusInfo[payload[0].payload.status].label}</small></div>;
}
function HistoryTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return <div className="monitor-tooltip"><strong>{label}</strong><span>ISBD: {payload[0].value}/100</span></div>;
}

function CompanyCard({ instancia, onOpen }) {
    const scores = scoresDe(instancia);
    const estado = normalizeStatus(instancia.estado, scoreStatus(instancia.isbd));
    const conexion = conexionDe(instancia);
    const indicators = [
        { key: 'indice', label: 'ISBD · Índice global', score: Number(instancia.isbd) || 0, status: estado },
        ...componentesDe(instancia).map((key) => ({
            key, label: `${COMPONENTS[key].code} · ${COMPONENT_LABEL[key]}`, score: scores[key], status: scoreStatus(scores[key]),
        })),
    ];
    return (
        <article className={`monitor-client-card status-${estado}`} role="button" tabIndex={0}
                 onClick={() => onOpen(instancia.instanciaId, 'indice')}
                 onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpen(instancia.instanciaId, 'indice'); }}>
            <header className="client-card-head">
                <div>
                    <span className={`client-live ${conexion.status}`}><i /> {conexion.label}</span>
                    <h2>{instancia.empresa || instancia.nombre}</h2>
                    <p className="mono">{instancia.nombre} · {tipoEtiqueta(instancia)}</p>
                </div>
                <HealthRing score={instancia.isbd} status={estado} size="small" />
            </header>
            <div className="client-alert-summary">
                <span className={`state-pill ${estado}`}>{statusInfo[estado].label}</span>
                <small>{instancia.origen === 'agente' ? 'Reportada por agente' : 'Lectura directa del backend'}</small>
            </div>
            <div className="client-indicators">
                {indicators.map((indicator) => (
                    <button key={indicator.key} className={`client-indicator indicator-${indicator.status}`}
                            onClick={(event) => { event.stopPropagation(); onOpen(instancia.instanciaId, indicator.key); }}>
                        <TrafficLight status={indicator.status} compact />
                        <span><small>{indicator.label}</small><strong>{Math.round(indicator.score)}<em>/100</em></strong></span>
                        <b aria-hidden="true">›</b>
                    </button>
                ))}
            </div>
            <footer className="client-card-foot">
                <span>{instancia.tipo === 'autonomous' ? 'Oracle Autonomous' : 'Oracle Database'}</span>
                <span className="mono">↻ {instancia.ultimaLectura ? new Date(instancia.ultimaLectura).toLocaleTimeString('es-CR') : '—'}</span>
            </footer>
        </article>
    );
}

function MetricCard({ metric }) {
    const def = METRIC_DEFS[metric.label] || { reference: true, source: 'ORACLE', help: 'Métrica informada por Oracle.' };
    const status = def.reference ? 'normal' : metricStatus(metric), value = Number(metric.valor);
    const progress = def.boolean ? (value === 1 ? 100 : 0) : def.max ? Math.max(0, Math.min((value / def.max) * 100, 100)) : 100;
    const display = def.boolean ? (value === 1 ? 'Sí' : 'No') : metric.valor;
    return <article className={`metric-card status-${status}`}>
        <header><div><span className="metric-status"><i />{def.reference ? 'Referencia' : metricStatusLabel[status]}</span><h4>{metric.label}</h4></div><TrafficLight status={status} compact /></header>
        <div className="metric-current"><strong>{display}</strong><span>{def.boolean ? '' : def.unit || ''}</span></div>
        <div className="metric-scale" style={{ background: scaleBackground(def) }}><i style={{ width: `${progress}%` }} /><b style={{ left: `${progress}%` }} /></div>
        {def.reference || def.boolean
            ? <div className="metric-reference">{def.boolean ? 'Condición binaria: se cumple o no se cumple' : 'Valor informativo de la instancia'}</div>
            : <div className="metric-range-list">{['normal', 'warning', 'degraded', 'critical'].map((rangeStatus, index) => <span key={rangeStatus}><i className={rangeStatus} /><b>{metricStatusLabel[rangeStatus]}</b><em>{def.ranges[index]}</em></span>)}</div>}
        <p>{def.help}</p><span className="metric-source mono">FUENTE: {def.source}</span>
    </article>;
}

function AlertsPanel({ metrics, onSelectComponent }) {
    const order = { critical: 0, degraded: 1, warning: 2 };
    const alerts = metrics.filter((metric) => !METRIC_DEFS[metric.label]?.reference && metricStatus(metric) !== 'normal').sort((a, b) => order[metricStatus(a)] - order[metricStatus(b)]);
    return <section className="monitor-alerts-panel real-alerts-panel"><div className="overview-intro"><div><span className="detail-eyebrow mono">ALERTAS ACTIVAS</span><h3>Problemas que no debe ocultar el índice</h3></div><p>Actualización en vivo</p></div>
        {alerts.length === 0 ? <div className="alert-empty"><i className="legend-dot healthy" /> Todos los componentes se encuentran dentro de los rangos normales.</div> : <div className="alert-list">{alerts.map((metric, index) => {
            const status = metricStatus(metric), def = METRIC_DEFS[metric.label];
            return <button key={`${metric.label}-${index}`} className={`monitor-alert status-${status}`} onClick={() => onSelectComponent(metric.componente)}><i className={`legend-dot ${status}`} /><span><strong>{metric.label}</strong><small>{COMPONENT_LABEL[metric.componente] || metric.componente} · valor {metric.valor}{def?.unit || ''}</small></span><span className="alert-threshold"><small>Rango normal</small><b>{def?.ranges?.[0] || 'Backend'}</b></span><em>{metricStatusLabel[status]}</em></button>;
        })}</div>}
    </section>;
}

// ---------------------------------------------------------------------------
export default function MonitoreoReal() {
    const [instancias, setInstancias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [history, setHistory] = useState({});          // { instanciaId: [{hora, isbd}] }
    const [seleccionada, setSeleccionada] = useState(null);
    const [selectedComponent, setSelectedComponent] = useState('Procesos');
    const [detailView, setDetailView] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [backendCaido, setBackendCaido] = useState(false);

    const loadHealth = useCallback(async (manual = false) => {
        if (manual) setRefreshing(true);
        try {
            const [estadoResult, listaResult] = await Promise.allSettled([
                getEstadoOracle(),
                getInstanciasOracle(),
            ]);
            setBackendCaido(estadoResult.status === 'rejected');
            if (listaResult.status === 'rejected') throw listaResult.reason;

            const data = Array.isArray(listaResult.value) ? listaResult.value : [];
            const now = new Date();
            setInstancias(data);
            setError('');
            setLastUpdated(now);

            const hora = now.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setHistory((previous) => {
                const next = { ...previous };
                data.forEach((inst) => {
                    const serie = next[inst.instanciaId] || [];
                    next[inst.instanciaId] = [...serie, { hora, isbd: Number(inst.isbd) || 0 }].slice(-12);
                });
                return next;
            });
        } catch (requestError) {
            setError(requestError.message || 'No se pudo consultar el estado de las instancias.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadHealth(); const interval = window.setInterval(loadHealth, 15000); return () => window.clearInterval(interval); }, [loadHealth]);

    const activa = useMemo(
        () => instancias.find((i) => i.instanciaId === seleccionada) || null,
        [instancias, seleccionada],
    );
    const metricsByComponent = useMemo(() => {
        if (!activa) return {};
        const metrics = activa.metricas || [];
        return Object.keys(COMPONENTS).reduce((groups, component) => ({
            ...groups, [component]: metrics.filter((metric) => metric.componente === component),
        }), {});
    }, [activa]);

    if (loading) return <div className="monitor-state-card"><span className="monitor-loader" /><h2>Conectando con las instancias</h2><p>Consultando las vistas de rendimiento…</p></div>;
    if (!instancias.length) return <div className="monitor-state-card is-error"><h2>No hay instancias que mostrar</h2><p>{error || 'El backend no devolvió ninguna instancia vigilada.'}</p><button className="monitor-refresh-button" onClick={() => loadHealth(true)}>Reintentar</button></div>;

    const chartData = instancias.map((inst, index) => ({
        nombre: `I${index + 1}`,
        cliente: inst.empresa || inst.nombre,
        indice: Number(inst.isbd) || 0,
        status: normalizeStatus(inst.estado, scoreStatus(inst.isbd)),
    }));
    const statusTotals = instancias.reduce((totals, inst) => {
        const key = normalizeStatus(inst.estado, scoreStatus(inst.isbd));
        totals[key] = (totals[key] || 0) + 1;
        return totals;
    }, { optimal: 0, healthy: 0, warning: 0, degraded: 0, critical: 0, unknown: 0 });
    const desconectadas = instancias.filter((i) => !i.conectado).length;

    const openDetail = (instanciaId, view) => {
        setSeleccionada(instanciaId);
        if (view !== 'indice') setSelectedComponent(view);
        setDetailView(view);
        window.setTimeout(() => document.getElementById('monitor-real-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    };

    // ---- Datos de la instancia abierta en el panel de detalle ----
    let detalle = null;
    if (activa && detailView) {
        const scores = scoresDe(activa);
        const componentes = componentesDe(activa);
        const comp = componentes.includes(selectedComponent) ? selectedComponent : componentes[0];
        const selectedMetrics = metricsByComponent[comp] || [];
        detalle = {
            scores, componentes, comp,
            estado: normalizeStatus(activa.estado, scoreStatus(activa.isbd)),
            def: COMPONENTS[comp],
            selectedMetrics,
            selectedStatus: scoreStatus(scores[comp]),
            statusCounts: selectedMetrics.reduce((counts, metric) => {
                if (!METRIC_DEFS[metric.label]?.reference) counts[metricStatus(metric)] += 1;
                return counts;
            }, { normal: 0, warning: 0, degraded: 0, critical: 0 }),
            serie: history[activa.instanciaId] || [],
            conexion: conexionDe(activa),
        };
    }

    return (
        <div className="monitor-page">
            <header className="monitor-page-header">
                <div><span className="monitor-kicker mono">ORACLE DATABASE · TIEMPO REAL</span><h1>Monitor de Salud de Oracle</h1><p>Datos técnicos → indicadores → análisis → ISBD → alertas → decisión.</p></div>
                <div className="monitor-header-actions">
                    <StatusLegend />
                    <span className="monitor-live-badge mono"><i /> {refreshing ? 'ACTUALIZANDO' : 'ACTUALIZACIÓN ACTIVA'}</span>
                    {lastUpdated && <small className="mono">ÚLTIMA LECTURA {lastUpdated.toLocaleTimeString('es-CR')}</small>}
                </div>
            </header>

            {error && <div className="monitor-stale-warning">La última actualización falló: {error}. Se conservan los datos anteriores.</div>}
            {backendCaido && !error && <div className="monitor-stale-warning">No se pudo confirmar el estado de conexión del backend.</div>}
            {desconectadas > 0 && <div className="monitor-stale-warning">{desconectadas === 1 ? 'Una instancia está sin contacto' : `${desconectadas} instancias están sin contacto`}. Se muestran sus últimos valores conocidos.</div>}

            <section className="monitor-hero-grid">
                <div className="monitor-chart-card">
                    <div className="monitor-section-title"><div><span className="mono">COMPARATIVO</span><h2>ISBD por instancia</h2></div><small>{FORMULA}</small></div>
                    <div className="health-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}><CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} /><Tooltip content={<MonitorTooltip />} cursor={{ fill: 'rgba(180, 144, 255, 0.05)' }} /><Bar dataKey="indice" radius={[6, 6, 2, 2]} maxBarSize={54}>{chartData.map((entry, index) => <Cell key={index} fill={statusInfo[entry.status].color} />)}</Bar></BarChart></ResponsiveContainer></div>
                </div>
                <div className="monitor-summary-card">
                    <div className="monitor-section-title"><div><span className="mono">RESUMEN</span><h2>Estado real de la red</h2></div><b>{instancias.length}</b></div>
                    <p className="summary-caption">{instancias.length === 1 ? 'Instancia vigilada' : 'Instancias vigiladas'}</p>
                    <div className="summary-statuses">{Object.entries(statusTotals).filter(([, total]) => total > 0).map(([status, total]) => <div key={status} className={`summary-status ${status}`}><TrafficLight status={status} compact /><span><strong>{total}</strong><small>{statusInfo[status].label}</small></span></div>)}</div>
                    <div className="summary-progress">{Object.entries(statusTotals).map(([status, total]) => total > 0 && <i key={status} className={status} style={{ width: `${(total / instancias.length) * 100}%` }} />)}</div>
                </div>
            </section>

            <section className="clients-section">
                <div className="monitor-section-title clients-title"><div><span className="mono">INSTANCIAS</span><h2>Bases monitoreadas</h2></div><small>Selecciona una instancia o un indicador para ampliar</small></div>
                <div className="monitor-client-grid">
                    {instancias.map((inst) => <CompanyCard key={inst.instanciaId} instancia={inst} onOpen={openDetail} />)}
                </div>
            </section>

            {detalle && (
                <section id="monitor-real-detail" className="monitor-detail-panel">
                    <header className="monitor-detail-header">
                        <div>
                            <button className="detail-back" onClick={() => { setDetailView(null); setSeleccionada(null); }}>← Volver a instancias</button>
                            <span className="detail-instance mono">{activa.nombre} · {tipoEtiqueta(activa)}</span>
                            <h2>{activa.empresa || activa.nombre}</h2>
                            <span className={`client-live ${detalle.conexion.status}`}><i /> {detalle.conexion.label}</span>
                        </div>
                        <div className="detail-tabs" role="tablist">
                            <button className={detailView === 'indice' ? 'active' : ''} onClick={() => setDetailView('indice')}>ISBD</button>
                            {detalle.componentes.map((component) => <button key={component} className={detailView === component ? 'active' : ''} onClick={() => { setSelectedComponent(component); setDetailView(component); }}>{COMPONENTS[component].code} · {COMPONENT_LABEL[component]}</button>)}
                        </div>
                        <button className="detail-close" aria-label="Cerrar detalle" onClick={() => { setDetailView(null); setSeleccionada(null); }}>×</button>
                    </header>

                    {detailView === 'indice' ? (
                        <div className="monitor-overview-wrapper">
                            <div className="monitor-overview-detail">
                                <section className="overview-score-panel">
                                    <span className="detail-eyebrow mono">ISBD · ÍNDICE GLOBAL</span>
                                    <HealthRing score={activa.isbd} status={detalle.estado} />
                                    <strong className={`status-text ${detalle.estado}`}>ESTADO REAL: {statusInfo[detalle.estado].label}</strong>
                                    {!activa.conectado && <p className="critical-override">Sin contacto: estos son los últimos valores conocidos.</p>}
                                    <p className="health-formula mono">{FORMULA}</p>
                                </section>
                                <section className="overview-categories">
                                    <div className="overview-intro">
                                        <div><span className="detail-eyebrow mono">INDICADORES PONDERADOS</span><h3>{detalle.componentes.length === 4 ? 'Procesos, memoria, archivos y recuperación' : 'Procesos, memoria y archivos'}</h3></div>
                                        <p>Selecciona un componente para consultar variables, umbrales y fuentes Oracle.</p>
                                    </div>
                                    <div className="overview-category-grid">
                                        {detalle.componentes.map((component) => {
                                            const componentScore = detalle.scores[component];
                                            const componentStatus = scoreStatus(componentScore);
                                            const alertCount = (metricsByComponent[component] || []).filter((metric) => !METRIC_DEFS[metric.label]?.reference && metricStatus(metric) !== 'normal').length;
                                            return <button key={component} className={`overview-category status-${componentStatus}`} onClick={() => openDetail(activa.instanciaId, component)}>
                                                <div className="overview-category-title"><TrafficLight status={componentStatus} compact /><span><small>{COMPONENTS[component].code} · peso {COMPONENTS[component].weight}%</small><strong>{Math.round(componentScore)}/100</strong></span></div>
                                                <div className="overview-category-bar"><i style={{ width: `${componentScore}%` }} /></div>
                                                <p>{alertCount === 0 ? 'Todas las variables normales' : `${alertCount} ${alertCount === 1 ? 'variable requiere' : 'variables requieren'} atención`}</p>
                                                <span className="category-link"><span>Ver {COMPONENT_LABEL[component].toLowerCase()}</span><b>→</b></span>
                                            </button>;
                                        })}
                                    </div>
                                </section>
                            </div>
                            <AlertsPanel metrics={activa.metricas || []} onSelectComponent={(component) => COMPONENTS[component] && openDetail(activa.instanciaId, component)} />
                            <section className="monitor-history-panel"><div className="overview-intro"><div><span className="detail-eyebrow mono">EVOLUCIÓN DE LA SESIÓN</span><h3>ISBD en las últimas 12 lecturas</h3></div><p>Se reinicia al recargar la página: el histórico persistente es el siguiente paso.</p></div><div className="history-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={detalle.serie} margin={{ top: 8, right: 18, left: -20, bottom: 0 }}><CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} /><Tooltip content={<HistoryTooltip />} /><Line type="monotone" dataKey="isbd" stroke={statusInfo[detalle.estado].color} strokeWidth={3} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div></section>
                        </div>
                    ) : (
                        <div className="category-detail">
                            <div className={`category-summary status-${detalle.selectedStatus}`}>
                                <div><span className="detail-eyebrow mono">{detalle.def.code} · PESO {detalle.def.weight}%</span><strong>{Math.round(detalle.scores[detalle.comp])}<small>/100</small></strong><p>{detalle.def.description}</p></div>
                                <TrafficLight status={detalle.selectedStatus} />
                                <div className="category-counts">{Object.entries(detalle.statusCounts).map(([status, total]) => <span key={status}><i className={`legend-dot ${status}`} /><b>{total}</b>{metricStatusLabel[status]}</span>)}</div>
                            </div>
                            <div className="oracle-source-banner"><span>Vistas Oracle utilizadas</span><b className="mono">{detalle.def.source}</b></div>
                            {detalle.selectedMetrics.length ? <div className="metric-grid">{detalle.selectedMetrics.map((metric, index) => <MetricCard key={`${metric.label}-${index}`} metric={metric} />)}</div> : <div className="alert-empty">Esta instancia no reportó métricas para {COMPONENT_LABEL[detalle.comp]}.</div>}
                        </div>
                    )}
                </section>
            )}

        </div>
    );
}
