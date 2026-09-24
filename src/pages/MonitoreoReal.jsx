import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getEstadoOracle, getInstanciasOracle } from '../api/monitoreoOracle';
import '../styles/monitoreo.css';
import '../styles/monitoreo-v2.css';

const statusInfo = {
    optimal: { label: 'Óptimo', color: '#22c55e' }, healthy: { label: 'Saludable', color: '#4ade80' },
    warning: { label: 'Advertencia', color: '#fbbf24' }, degraded: { label: 'Degradado', color: '#fb923c' },
    critical: { label: 'Crítico', color: '#f87171' }, normal: { label: 'Normal', color: '#4ade80' },
    unknown: { label: 'Sin datos', color: '#94a3b8' },
};

// El backend usa estados en español en los niveles internos (normal /
// advertencia / critico) y en inglés en el nivel de instancia. Este
// normalizador acepta los dos y devuelve siempre una clave de statusInfo.
function normalizeStatus(value, fallback = 'normal') {
    const n = String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const alias = {
        optimo: 'optimal', saludable: 'healthy', advertencia: 'warning',
        degradado: 'degraded', alto: 'degraded', critico: 'critical',
        normal: 'normal', desconocido: 'unknown',
    };
    const s = alias[n] || n;
    return statusInfo[s] ? s : fallback;
}

const FUENTE_TEXTO = {
    DOCUMENTO: 'Especificación del curso',
    REVISION: 'Tabla de la revisión',
    MEDICION: 'Medido en la instancia',
    CONVENCION: 'Convención de Oracle · sin validar aquí',
    SIN_UMBRAL: 'Variable informativa',
};

function fmtNumero(v) {
    if (v === null || v === undefined) return '—';
    const n = Number(v);
    if (Number.isNaN(n)) return String(v);
    if (Number.isInteger(n)) return String(n);
    return n.toFixed(2);
}
function valorTexto(v) {
    if (v.valorTexto) return v.valorTexto;
    if (v.direccion === 'BOOLEANA') return Number(v.valor) === 1 ? 'Sí' : 'No';
    return fmtNumero(v.valor) + (v.unidad || '');
}
function tiempoRelativo(seg) {
    if (seg === null || seg === undefined) return '';
    if (seg < 60) return `${seg} s`;
    const m = Math.floor(seg / 60);
    return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
function conexionDe(i) {
    if (i.origen === 'agente') {
        return i.conectado
            ? { estado: 'online', texto: `AGENTE ACTIVO · HACE ${tiempoRelativo(i.segundosSinContacto).toUpperCase()}` }
            : { estado: 'offline', texto: `SIN CONTACTO · HACE ${tiempoRelativo(i.segundosSinContacto).toUpperCase()}` };
    }
    return i.conectado
        ? { estado: 'online', texto: 'LECTURA DIRECTA' }
        : { estado: 'offline', texto: 'SIN CONEXIÓN' };
}
const tipoEtiqueta = (i) => i.tipo === 'autonomous' ? 'AUTONOMOUS · ORACLE CLOUD' : 'TRADICIONAL · ON-PREMISE';

// ---------------------------------------------------------------------------
function TrafficLight({ status, compact = false }) {
    const s = normalizeStatus(status);
    const on = ['optimal', 'healthy', 'normal'].includes(s) ? 'green' : s === 'warning' ? 'yellow' : 'red';
    return <span className={`monitor-traffic ${compact ? 'compact' : ''}`} aria-label={`Estado ${statusInfo[s].label}`}>
        {['red', 'yellow', 'green'].map((l) => <span key={l} className={`monitor-traffic-light ${on === l ? 'is-active' : ''}`}
                                                     style={on === l ? { '--lamp-color': statusInfo[s].color } : undefined} />)}
    </span>;
}
function HealthRing({ score, status, size = '' }) {
    const v = Math.max(0, Math.min(Number(score) || 0, 100));
    const s = normalizeStatus(status);
    return <div className={`health-ring ${size}`} style={{ '--score': `${v * 3.6}deg`, '--ring-color': statusInfo[s].color }}>
        <div className="health-ring-center"><strong>{v}</strong><span>/100</span></div></div>;
}
function StatusLegend() {
    return <div className="monitor-legend" aria-label="Escala del ISBD">
        {['optimal', 'healthy', 'warning', 'degraded', 'critical'].map((s) =>
            <span key={s}><i className={`legend-dot ${s}`} />{statusInfo[s].label}</span>)}</div>;
}
function MonitorTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return <div className="monitor-tooltip"><strong>{p.cliente}</strong><span>ISBD: {payload[0].value}/100</span>
        <small>{statusInfo[p.status].label}</small></div>;
}
function HistoryTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return <div className="monitor-tooltip"><strong>{label}</strong><span>ISBD: {payload[0].value}/100</span></div>;
}

/**
 * Las causas críticas, arriba de todo y en rojo.
 *
 * Es la contraparte visual de la regla de prevalencia del backend: si un
 * componente está en falla, no puede quedar escondido tres niveles abajo
 * mientras el índice se ve verde.
 */
function CausasCriticas({ causas }) {
    if (!causas?.length) return null;
    return <div className="causas-criticas">
        <h4>Condiciones críticas detectadas</h4>
        <ul>{causas.map((c, i) => <li key={i}>{c}</li>)}</ul>
        <p className="causa-nota">
            Cualquiera de estas fuerza el estado global a crítico, sin importar el promedio ponderado.
        </p>
    </div>;
}

function CompanyCard({ instancia, onOpen }) {
    const estado = normalizeStatus(instancia.estado);
    const conexion = conexionDe(instancia);
    return (
        <article className={`monitor-client-card status-${estado}`} role="button" tabIndex={0}
                 onClick={() => onOpen(instancia.instanciaId, 'ISBD')}
                 onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(instancia.instanciaId, 'ISBD'); }}>
            <header className="client-card-head">
                <div>
                    <span className={`client-live ${conexion.estado}`}><i /> {conexion.texto}</span>
                    <h2>{instancia.empresa || instancia.nombre}</h2>
                    <p className="mono">{instancia.nombre} · {tipoEtiqueta(instancia)}</p>
                </div>
                <HealthRing score={instancia.isbd} status={estado} size="small" />
            </header>

            <div className="client-alert-summary">
                <span className={`state-pill ${estado}`}>{statusInfo[estado].label}</span>
                <small>{instancia.causasCriticas?.length
                    ? `${instancia.causasCriticas.length} condición${instancia.causasCriticas.length > 1 ? 'es' : ''} crítica${instancia.causasCriticas.length > 1 ? 's' : ''}`
                    : 'Sin condiciones críticas'}</small>
                <span className="badge-origen">{instancia.origen === 'agente' ? 'agente' : 'directo'}</span>
            </div>

            <div className="client-indicators">
                <button className={`client-indicator indicator-${estado}`}
                        onClick={(e) => { e.stopPropagation(); onOpen(instancia.instanciaId, 'ISBD'); }}>
                    <TrafficLight status={estado} compact />
                    <span><small>ISBD · Índice global</small>
                        <strong>{Math.round(instancia.isbd)}<em>/100</em></strong></span>
                    <b aria-hidden="true">›</b>
                </button>
                {(instancia.indicadores || []).map((ind) => {
                    const e = normalizeStatus(ind.estado);
                    return <button key={ind.codigo} className={`client-indicator indicator-${e}`}
                                   onClick={(ev) => { ev.stopPropagation(); onOpen(instancia.instanciaId, ind.codigo); }}>
                        <TrafficLight status={e} compact />
                        <span><small>{ind.codigo} · {ind.nombre} · peso {ind.peso}%</small>
                            <strong>{Math.round(ind.puntaje)}<em>/100</em></strong></span>
                        <b aria-hidden="true">›</b>
                    </button>;
                })}
            </div>

            <footer className="client-card-foot">
                <span>{instancia.tipo === 'autonomous' ? 'Oracle Autonomous' : 'Oracle Database'}</span>
                <span className="mono">↻ {instancia.ultimaLectura
                    ? new Date(instancia.ultimaLectura).toLocaleTimeString('es-CR') : '—'}</span>
            </footer>
        </article>
    );
}

/**
 * Fila de una variable más su expansión.
 *
 * Las columnas visibles son las que se pidieron en la revisión: variable,
 * valor actual, límite inferior, límite superior y estado. Al expandir
 * aparece cómo se obtiene el valor —la consulta literal—, de dónde sale el
 * umbral, la acción remedial y el desglose por archivo físico.
 */
function FilaVariable({ v, abierta, onToggle }) {
    const esRef = v.direccion === 'REFERENCIA';
    const estado = esRef ? 'referencia' : normalizeStatus(v.estado);
    const fuenteClase = String(v.fuenteUmbral || '').toLowerCase();

    return <>
        <tr className={`fila-var ${esRef ? 'fila-referencia' : ''}`} onClick={onToggle}>
            <td className="col-codigo">{v.codigo}</td>
            <td>
                <strong>{v.nombre}</strong>
                <span className={`pill-fuente ${fuenteClase}`} title={FUENTE_TEXTO[v.fuenteUmbral] || ''}>
                    {v.fuenteUmbral === 'SIN_UMBRAL' ? 'ref' : (v.fuenteUmbral || '').toLowerCase()}
                </span>
                {v.peso > 0 && <span className="pill-fuente">peso {v.peso}%</span>}
            </td>
            <td className="col-valor">{valorTexto(v)}</td>
            <td className="col-limite">{esRef ? '—' : fmtNumero(v.limiteInferior)}</td>
            <td className="col-limite">{esRef ? '—' : (v.limiteSuperior === null || v.limiteSuperior === undefined ? '∞' : fmtNumero(v.limiteSuperior))}</td>
            <td className="col-estado">
                <span className={`pill-estado ${estado}`}>
                    {esRef ? 'Referencia' : statusInfo[estado].label}
                </span>
            </td>
            <td style={{ width: 24, opacity: 0.5 }}>{abierta ? '▾' : '▸'}</td>
        </tr>

        {abierta && <tr className="fila-detalle">
            <td colSpan={7}>
                <div className="detalle-caja">
                    <div className="detalle-bloque">
                        <h5>Cómo se obtiene este valor</h5>
                        <pre className="consulta-sql">{v.consulta}</pre>
                    </div>

                    <div className="detalle-bloque">
                        <h5>Rango permitido · {FUENTE_TEXTO[v.fuenteUmbral] || v.fuenteUmbral}</h5>
                        <p>{v.rangoNormal}</p>
                    </div>

                    {v.ayuda && <div className="detalle-bloque">
                        <h5>Qué significa</h5>
                        <p>{v.ayuda}</p>
                    </div>}

                    {v.remediacion && <div className="detalle-bloque">
                        <h5>Acción remedial</h5>
                        <div className="remediacion">{v.remediacion}</div>
                    </div>}

                    {v.detalle?.length > 0 && <div className="detalle-bloque">
                        <h5>Origen físico ({v.detalle.length})</h5>
                        <table className="tabla-origen">
                            <thead><tr><th>Objeto</th><th>Archivo en disco</th><th style={{ textAlign: 'right' }}>Valor</th><th>Estado</th></tr></thead>
                            <tbody>
                            {v.detalle.map((d, i) => {
                                const e = normalizeStatus(d.estado);
                                return <tr key={i} className={i === 0 && e === 'critical' ? 'peor' : ''}>
                                    <td><strong>{d.nombre}</strong>{d.nota && <><br /><small style={{ opacity: 0.6 }}>{d.nota}</small></>}</td>
                                    <td className="ruta">{d.origen || '—'}</td>
                                    <td className="valor">{d.valorTexto || fmtNumero(d.valor) + (v.unidad || '')}</td>
                                    <td><span className={`pill-estado ${e}`}>{statusInfo[e].label}</span></td>
                                </tr>;
                            })}
                            </tbody>
                        </table>
                    </div>}
                </div>
            </td>
        </tr>}
    </>;
}

function GrupoBloque({ grupo, abiertoPorDefecto }) {
    const [abierto, setAbierto] = useState(abiertoPorDefecto);
    const [filaAbierta, setFilaAbierta] = useState(null);
    const estado = normalizeStatus(grupo.estado);
    const conProblema = (grupo.variables || []).filter(
        (v) => v.peso > 0 && normalizeStatus(v.estado) !== 'normal').length;

    return <div className="grupo-bloque">
        <button className={`grupo-head ${abierto ? 'abierto' : ''}`} onClick={() => setAbierto(!abierto)}>
            <span className="chev">▸</span>
            <TrafficLight status={estado} compact />
            <strong>{grupo.nombre}</strong>
            <span className="grupo-meta">
                <span>{conProblema === 0 ? 'todo normal' : `${conProblema} fuera de rango`}</span>
                <span>peso {grupo.peso}%</span>
                <span className="grupo-puntaje">{Math.round(grupo.puntaje)}</span>
            </span>
        </button>

        {abierto && <table className="tabla-variables">
            <thead><tr>
                <th></th><th>Variable</th><th style={{ textAlign: 'right' }}>Valor actual</th>
                <th className="col-limite" style={{ textAlign: 'right' }}>Límite inf.</th>
                <th className="col-limite" style={{ textAlign: 'right' }}>Límite sup.</th>
                <th>Estado</th><th></th>
            </tr></thead>
            <tbody>
            {(grupo.variables || []).map((v) =>
                <FilaVariable key={v.codigo} v={v}
                              abierta={filaAbierta === v.codigo}
                              onToggle={() => setFilaAbierta(filaAbierta === v.codigo ? null : v.codigo)} />)}
            </tbody>
        </table>}
    </div>;
}

function PanelIndicador({ indicador }) {
    const estado = normalizeStatus(indicador.estado);
    const hayProblema = (g) => (g.variables || []).some(
        (v) => v.peso > 0 && normalizeStatus(v.estado) !== 'normal');

    return <div className="category-detail">
        <div className={`category-summary status-${estado}`}>
            <div>
                <span className="detail-eyebrow mono">{indicador.codigo} · PESO {indicador.peso}%</span>
                <strong>{Math.round(indicador.puntaje)}<small>/100</small></strong>
                <p>{indicador.nombre}</p>
            </div>
            <TrafficLight status={estado} />
        </div>

        {indicador.notaAgregacion && <div className="nota-agregacion">
            <span className="agregacion-pill">{indicador.agregacion === 'peor_caso' ? 'peor caso' : 'ponderado'}</span>
            <span>{indicador.notaAgregacion}</span>
        </div>}

        {(indicador.grupos || []).map((g) =>
            <GrupoBloque key={g.codigo} grupo={g} abiertoPorDefecto={hayProblema(g)} />)}
    </div>;
}

// ---------------------------------------------------------------------------
export default function MonitoreoReal() {
    const [instancias, setInstancias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [history, setHistory] = useState({});
    const [seleccionada, setSeleccionada] = useState(null);
    const [pestana, setPestana] = useState('ISBD');
    const [lastUpdated, setLastUpdated] = useState(null);

    const loadHealth = useCallback(async (manual = false) => {
        if (manual) setRefreshing(true);
        try {
            const [, lista] = await Promise.allSettled([getEstadoOracle(), getInstanciasOracle()]);
            if (lista.status === 'rejected') throw lista.reason;

            const data = Array.isArray(lista.value) ? lista.value : [];
            const now = new Date();
            setInstancias(data);
            setError('');
            setLastUpdated(now);

            const hora = now.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setHistory((prev) => {
                const next = { ...prev };
                data.forEach((i) => {
                    const serie = next[i.instanciaId] || [];
                    next[i.instanciaId] = [...serie, { hora, isbd: Number(i.isbd) || 0 }].slice(-12);
                });
                return next;
            });
        } catch (e) {
            setError(e.message || 'No se pudo consultar el estado de las instancias.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadHealth();
        const t = window.setInterval(loadHealth, 15000);
        return () => window.clearInterval(t);
    }, [loadHealth]);

    const activa = useMemo(
        () => instancias.find((i) => i.instanciaId === seleccionada) || null,
        [instancias, seleccionada]);

    if (loading) return <div className="monitor-state-card"><span className="monitor-loader" />
        <h2>Conectando con las instancias</h2><p>Consultando las vistas de rendimiento…</p></div>;

    if (!instancias.length) return <div className="monitor-state-card is-error">
        <h2>No hay instancias que mostrar</h2>
        <p>{error || 'El backend no devolvió ninguna instancia vigilada.'}</p>
        <button className="monitor-refresh-button" onClick={() => loadHealth(true)}>Reintentar</button></div>;

    const chartData = instancias.map((i, n) => ({
        nombre: `I${n + 1}`,
        cliente: i.empresa || i.nombre,
        indice: Number(i.isbd) || 0,
        status: normalizeStatus(i.estado),
    }));
    const totales = instancias.reduce((t, i) => {
        const k = normalizeStatus(i.estado);
        t[k] = (t[k] || 0) + 1;
        return t;
    }, { optimal: 0, healthy: 0, warning: 0, degraded: 0, critical: 0, unknown: 0 });

    const desconectadas = instancias.filter((i) => !i.conectado).length;
    const causasGlobales = instancias.flatMap(
        (i) => (i.causasCriticas || []).map((c) => `${i.empresa || i.nombre} · ${c}`));

    const abrir = (id, tab) => {
        setSeleccionada(id);
        setPestana(tab);
        window.setTimeout(() => document.getElementById('monitor-real-detail')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    };

    const indActiva = activa?.indicadores?.find((x) => x.codigo === pestana) || null;
    const conexionActiva = activa ? conexionDe(activa) : null;
    const estadoActiva = activa ? normalizeStatus(activa.estado) : 'unknown';
    const serieActiva = activa ? (history[activa.instanciaId] || []) : [];
    const indiceTopado = activa && Math.abs((activa.isbdPonderado ?? activa.isbd) - activa.isbd) > 0.05;

    return (
        <div className="monitor-page">
            <header className="monitor-page-header">
                <div>
                    <span className="monitor-kicker mono">ORACLE DATABASE · TIEMPO REAL</span>
                    <h1>Monitor de Salud de Oracle</h1>
                    <p>Datos técnicos → indicadores → análisis → ISBD → alertas → decisión.</p>
                </div>
                <div className="monitor-header-actions">
                    <StatusLegend />
                    <span className="monitor-live-badge mono"><i /> {refreshing ? 'ACTUALIZANDO' : 'ACTUALIZACIÓN ACTIVA'}</span>
                    {lastUpdated && <small className="mono">ÚLTIMA LECTURA {lastUpdated.toLocaleTimeString('es-CR')}</small>}
                </div>
            </header>

            {error && <div className="monitor-stale-warning">
                La última actualización falló: {error}. Se conservan los datos anteriores.</div>}
            {desconectadas > 0 && <div className="monitor-stale-warning">
                {desconectadas === 1 ? 'Una instancia está sin contacto' : `${desconectadas} instancias están sin contacto`}.
                Se muestran sus últimos valores conocidos.</div>}

            <CausasCriticas causas={causasGlobales} />

            <section className="monitor-hero-grid">
                <div className="monitor-chart-card">
                    <div className="monitor-section-title">
                        <div><span className="mono">COMPARATIVO</span><h2>ISBD por instancia</h2></div>
                        <small>{instancias[0]?.formula || '0.30(IP) + 0.35(IM) + 0.35(IA)'}</small>
                    </div>
                    <div className="health-chart"><ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                            <CartesianGrid stroke="var(--line)" vertical={false} />
                            <XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                            <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                            <Tooltip content={<MonitorTooltip />} cursor={{ fill: 'rgba(180, 144, 255, 0.05)' }} />
                            <Bar dataKey="indice" radius={[6, 6, 2, 2]} maxBarSize={54}>
                                {chartData.map((e, i) => <Cell key={i} fill={statusInfo[e.status].color} />)}
                            </Bar>
                        </BarChart></ResponsiveContainer></div>
                </div>

                <div className="monitor-summary-card">
                    <div className="monitor-section-title">
                        <div><span className="mono">RESUMEN</span><h2>Estado real de la red</h2></div>
                        <b>{instancias.length}</b>
                    </div>
                    <p className="summary-caption">{instancias.length === 1 ? 'Instancia vigilada' : 'Instancias vigiladas'}</p>
                    <div className="summary-statuses">
                        {Object.entries(totales).filter(([, t]) => t > 0).map(([s, t]) =>
                            <div key={s} className={`summary-status ${s}`}><TrafficLight status={s} compact />
                                <span><strong>{t}</strong><small>{statusInfo[s].label}</small></span></div>)}
                    </div>
                    <div className="summary-progress">
                        {Object.entries(totales).map(([s, t]) => t > 0 &&
                            <i key={s} className={s} style={{ width: `${(t / instancias.length) * 100}%` }} />)}
                    </div>
                </div>
            </section>

            <section className="clients-section">
                <div className="monitor-section-title clients-title">
                    <div><span className="mono">INSTANCIAS</span><h2>Bases monitoreadas</h2></div>
                    <small>Selecciona una instancia o un indicador para ampliar</small>
                </div>
                <div className="monitor-client-grid">
                    {instancias.map((i) => <CompanyCard key={i.instanciaId} instancia={i} onOpen={abrir} />)}
                </div>
            </section>

            {activa && (
                <section id="monitor-real-detail" className="monitor-detail-panel">
                    <header className="monitor-detail-header">
                        <div>
                            <button className="detail-back" onClick={() => setSeleccionada(null)}>← Volver a instancias</button>
                            <span className="detail-instance mono">{activa.nombre} · {tipoEtiqueta(activa)}</span>
                            <h2>{activa.empresa || activa.nombre}</h2>
                            <span className={`client-live ${conexionActiva.estado}`}><i /> {conexionActiva.texto}</span>
                        </div>
                        <div className="detail-tabs" role="tablist">
                            <button className={pestana === 'ISBD' ? 'active' : ''} onClick={() => setPestana('ISBD')}>ISBD</button>
                            {(activa.indicadores || []).map((ind) =>
                                <button key={ind.codigo} className={pestana === ind.codigo ? 'active' : ''}
                                        onClick={() => setPestana(ind.codigo)}>{ind.codigo} · {ind.nombre}</button>)}
                        </div>
                        <button className="detail-close" aria-label="Cerrar detalle" onClick={() => setSeleccionada(null)}>×</button>
                    </header>

                    {pestana === 'ISBD' ? (
                        <div className="monitor-overview-wrapper">
                            <div className="monitor-overview-detail">
                                <section className="overview-score-panel">
                                    <span className="detail-eyebrow mono">ISBD · ÍNDICE GLOBAL</span>
                                    <HealthRing score={activa.isbd} status={estadoActiva} />
                                    <strong className={`status-text ${estadoActiva}`}>ESTADO REAL: {statusInfo[estadoActiva].label}</strong>
                                    {!activa.conectado && <p className="critical-override">
                                        Sin contacto: estos son los últimos valores conocidos.</p>}
                                    <p className="health-formula mono">{activa.formula}</p>
                                    {indiceTopado && <p className="isbd-doble">
                                        El promedio ponderado da <b>{activa.isbdPonderado}</b>, pero hay una condición
                                        crítica, así que el índice baja a la banda crítica. Se muestran los dos números
                                        para no ocultar ninguno: el ponderado describe el conjunto, el índice describe
                                        que hay un componente en falla.
                                    </p>}
                                </section>

                                <section className="overview-categories">
                                    <div className="overview-intro">
                                        <div><span className="detail-eyebrow mono">INDICADORES PONDERADOS</span>
                                            <h3>Procesos, memoria y archivos</h3></div>
                                        <p>Selecciona un indicador para ver sus grupos, variables, umbrales y origen físico.</p>
                                    </div>
                                    <div className="overview-category-grid">
                                        {(activa.indicadores || []).map((ind) => {
                                            const e = normalizeStatus(ind.estado);
                                            const alertas = (ind.grupos || []).flatMap((g) => g.variables || [])
                                                .filter((v) => v.peso > 0 && normalizeStatus(v.estado) !== 'normal').length;
                                            return <button key={ind.codigo} className={`overview-category status-${e}`}
                                                           onClick={() => setPestana(ind.codigo)}>
                                                <div className="overview-category-title">
                                                    <TrafficLight status={e} compact />
                                                    <span><small>{ind.codigo} · peso {ind.peso}%</small>
                                                        <strong>{Math.round(ind.puntaje)}/100</strong></span>
                                                </div>
                                                <div className="overview-category-bar"><i style={{ width: `${ind.puntaje}%` }} /></div>
                                                <p>{alertas === 0 ? 'Todas las variables normales'
                                                    : `${alertas} ${alertas === 1 ? 'variable requiere' : 'variables requieren'} atención`}</p>
                                                <span className="category-link"><span>Ver {ind.nombre.toLowerCase()}</span><b>→</b></span>
                                            </button>;
                                        })}
                                    </div>
                                </section>
                            </div>

                            <section className="monitor-history-panel">
                                <div className="overview-intro">
                                    <div><span className="detail-eyebrow mono">EVOLUCIÓN DE LA SESIÓN</span>
                                        <h3>ISBD en las últimas 12 lecturas</h3></div>
                                    <p>Se reinicia al recargar: el histórico persistente es el siguiente paso.</p>
                                </div>
                                <div className="history-chart"><ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={serieActiva} margin={{ top: 8, right: 18, left: -20, bottom: 0 }}>
                                        <CartesianGrid stroke="var(--line)" vertical={false} />
                                        <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                                        <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                                        <Tooltip content={<HistoryTooltip />} />
                                        <Line type="monotone" dataKey="isbd" stroke={statusInfo[estadoActiva].color} strokeWidth={3} dot={{ r: 3 }} />
                                    </LineChart></ResponsiveContainer></div>
                            </section>
                        </div>
                    ) : indActiva ? (
                        <PanelIndicador indicador={indActiva} />
                    ) : (
                        <div className="alert-empty">Esta instancia no reportó datos para {pestana}.</div>
                    )}
                </section>
            )}
        </div>
    );
}