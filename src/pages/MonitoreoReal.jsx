import { useEffect, useState } from 'react';
import {
    Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { getSaludOracle } from '../api/monitoreoOracle';
import '../styles/monitoreo.css';

const statusInfo = {
    optimal:  { label: 'Óptimo',    color: '#22c55e' },
    healthy:  { label: 'Saludable', color: '#22c55e' },
    warning:  { label: 'Advertencia', color: '#fbbf24' },
    degraded: { label: 'Degradado', color: '#fb923c' },
    critical: { label: 'Crítico',   color: '#f87171' },
    normal:   { label: 'Normal',    color: '#4ade80' },
};
const metricStatusLabel = { normal: 'Normal', warning: 'Advertencia', degraded: 'Alto', critical: 'Crítico' };

// Definiciones de umbrales para las 12 metricas reales (por su label del backend).
// higher = peor cuanto mas alto; lower = peor cuanto mas bajo; ref = solo referencia.
const DEFS = {
    'Sesiones totales':   { max: 500, dir: 'higher', w: 345, d: 425, c: 475, nr: '0–344', wr: '345–424', dr: '425–474', cr: '475+', unit: '', src: 'V$SESSION', help: 'Total de sesiones conectadas a la instancia.' },
    'Sesiones activas':   { max: 100, dir: 'higher', w: 70,  d: 85,  c: 95,  nr: '0–69', wr: '70–84', dr: '85–94', cr: '95+', unit: '', src: 'V$SESSION', help: 'Sesiones ejecutando actividad.' },
    'Sesiones inactivas': { max: 100, dir: 'higher', w: 70,  d: 85,  c: 95,  nr: '0–69', wr: '70–84', dr: '85–94', cr: '95+', unit: '', src: 'V$SESSION', help: 'Sesiones conectadas sin actividad.' },
    'Sesiones bloqueadas':{ max: 8,   dir: 'higher', w: 1,   d: 3,   c: 5,   nr: '0', wr: '1–2', dr: '3–4', cr: '5+', unit: '', src: 'V$SESSION', help: 'Sesiones esperando por un bloqueo.' },
    'Procesos':           { max: 300, dir: 'higher', w: 208, d: 255, c: 285, nr: '0–207', wr: '208–254', dr: '255–284', cr: '285+', unit: '', src: 'V$PROCESS', help: 'Procesos Oracle activos.' },
    'SGA total (MB)':     { ref: true, unit: ' MB', src: 'V$SGASTAT', help: 'Tamaño total de la memoria compartida (referencia).' },
    'SGA libre (MB)':     { ref: true, unit: ' MB', src: 'V$SGASTAT', help: 'Memoria libre dentro de la SGA (referencia).' },
    'Uso de SGA (%)':     { max: 100, dir: 'higher', w: 80, d: 90, c: 95, nr: '0–79', wr: '80–89', dr: '90–94', cr: '95+', unit: '%', src: 'V$SGASTAT', help: 'Porcentaje de la SGA en uso.' },
    'Buffer cache hit (%)':{ max: 100, dir: 'lower', w: 90, d: 85, c: 80, nr: '90–100', wr: '85–89', dr: '80–84', cr: '<80', unit: '%', src: 'V$SYSSTAT', help: 'Lecturas atendidas desde memoria.' },
    'Tablespaces':        { ref: true, unit: '', src: 'DBA_TABLESPACES', help: 'Cantidad de tablespaces (referencia).' },
    'Max uso tablespace (%)':{ max: 100, dir: 'higher', w: 80, d: 85, c: 90, nr: '0–79', wr: '80–84', dr: '85–89', cr: '90+', unit: '%', src: 'DBA_DATA_FILES', help: 'Ocupación del tablespace más lleno.' },
    'Datafiles online':   { ref: true, unit: '', src: 'V$DATAFILE', help: 'Datafiles operativos (referencia).' },
    'Datafiles con problema':{ max: 5, dir: 'higher', w: 1, d: 2, c: 3, nr: '0', wr: '1', dr: '2', cr: '3+', unit: '', src: 'V$DATAFILE', help: 'Datafiles fuera de línea o con problemas.' },
};

function scaleBackground(def) {
    if (def.ref) return 'linear-gradient(90deg, var(--violet, #8b5cf6), var(--blue, #3b82f6))';
    if (def.dir === 'lower') {
        const c = (def.c / def.max) * 100, d = (def.d / def.max) * 100, w = (def.w / def.max) * 100;
        return `linear-gradient(90deg, var(--monitor-critical) 0 ${c}%, var(--monitor-degraded) ${c}% ${d}%, var(--monitor-warning) ${d}% ${w}%, var(--monitor-normal) ${w}% 100%)`;
    }
    const w = (def.w / def.max) * 100, d = (def.d / def.max) * 100, c = (def.c / def.max) * 100;
    return `linear-gradient(90deg, var(--monitor-normal) 0 ${w}%, var(--monitor-warning) ${w}% ${d}%, var(--monitor-degraded) ${d}% ${c}%, var(--monitor-critical) ${c}% 100%)`;
}

function TrafficLight({ status, compact = false }) {
    const activeLamp = ['optimal', 'healthy', 'normal'].includes(status) ? 'green' : status === 'warning' ? 'yellow' : 'red';
    return (
        <span className={`monitor-traffic ${compact ? 'compact' : ''}`} aria-label={`Estado ${statusInfo[status]?.label || status}`}>
            {['red', 'yellow', 'green'].map((lamp) => (
                <span key={lamp}
                      className={`monitor-traffic-light ${activeLamp === lamp ? 'is-active' : ''}`}
                      style={activeLamp === lamp ? { '--lamp-color': statusInfo[status]?.color } : undefined} />
            ))}
        </span>
    );
}

// Tarjeta de metrica IDENTICA a la de la companera
function MetricCardReal({ metrica }) {
    const def = DEFS[metrica.label] || { ref: true, unit: '', src: 'ORACLE', help: '' };
    const status = metrica.estado || 'normal';
    const progress = def.max ? Math.min((metrica.valor / def.max) * 100, 100) : 100;
    return (
        <article className={`metric-card status-${status}`}>
            <header>
                <div>
                    <span className="metric-status"><i />{def.ref ? 'Referencia' : metricStatusLabel[status]}</span>
                    <h4>{metrica.label}</h4>
                </div>
                <TrafficLight status={status} compact />
            </header>
            <div className="metric-current"><strong>{metrica.valor}</strong><span>{def.unit}</span></div>
            <div className="metric-scale" style={{ background: scaleBackground(def) }}>
                <i style={{ width: `${progress}%` }} /><b style={{ left: `${progress}%` }} />
            </div>
            {def.ref ? (
                <div className="metric-reference">Valor de referencia</div>
            ) : (
                <div className="metric-range-list">
                    <span><i className="normal" /><b>Normal</b><em>{def.nr}</em></span>
                    <span><i className="warning" /><b>Advertencia</b><em>{def.wr}</em></span>
                    <span><i className="degraded" /><b>Alto</b><em>{def.dr}</em></span>
                    <span><i className="critical" /><b>Crítico</b><em>{def.cr}</em></span>
                </div>
            )}
            <p>{def.help}</p>
            <span className="metric-source mono">FUENTE: {def.src}</span>
        </article>
    );
}

function ComponenteReal({ codigo, label, valor, metricas }) {
    const status = valor < 40 ? 'critical' : valor < 60 ? 'degraded' : valor < 75 ? 'warning' : 'normal';
    const counts = metricas.reduce((a, m) => {
        const def = DEFS[m.label];
        if (def && !def.ref) a[m.estado || 'normal'] += 1;
        return a;
    }, { normal: 0, warning: 0, degraded: 0, critical: 0 });
    return (
        <div className="category-detail" style={{ marginBottom: 24 }}>
            <div className={`category-summary status-${status}`}>
                <div>
                    <span className="detail-eyebrow mono">{codigo}</span>
                    <strong>{valor}<small>/100</small></strong>
                    <p>Indicador de {label} calculado desde métricas reales de Oracle.</p>
                </div>
                <TrafficLight status={status} />
                <div className="category-counts">
                    {Object.entries(counts).map(([k, t]) => <span key={k}><i className={`legend-dot ${k}`} /><b>{t}</b>{metricStatusLabel[k]}</span>)}
                </div>
            </div>
            <div className="metric-grid">
                {metricas.map((m, i) => <MetricCardReal key={i} metrica={m} />)}
            </div>
        </div>
    );
}

export default function MonitoreoReal() {
    const [salud, setSalud] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [historial, setHistorial] = useState([]);

    const cargar = async () => {
        setError('');
        try {
            const data = await getSaludOracle();
            setSalud(data);
            setHistorial((prev) => {
                const ahora = new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
                return [...prev, { hora: ahora, isbd: data.isbd }].slice(-12);
            });
        } catch (err) {
            setError('No se pudo leer la salud de Oracle. ¿El backend está conectado?');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargar();
        const t = setInterval(cargar, 15000);
        return () => clearInterval(t);
    }, []);

    if (loading) return <p style={{ color: 'var(--muted)' }}>Conectando con la instancia Oracle...</p>;
    if (error || !salud) {
        return (
            <div>
                <div className="monitor-section-title"><div><span className="mono">MONITOR ORACLE</span><h2>Salud de la base de datos</h2></div></div>
                <div className="chart-card" style={{ borderColor: 'var(--monitor-critical)' }}>
                    <p style={{ color: 'var(--monitor-critical)' }}>{error || 'Sin datos'}</p>
                </div>
            </div>
        );
    }

    const estadoGlobal = salud.estado || 'healthy';
    const porComp = (c) => (salud.metricas || []).filter((m) => m.componente === c);

    return (
        <div>
            <div className="monitor-section-title">
                <div><span className="mono">MONITOR ORACLE · EN VIVO</span><h2>Salud de la instancia Oracle</h2></div>
                <b>{salud.isbd}</b>
            </div>

            <div className={`category-summary status-${estadoGlobal}`} style={{ marginBottom: 20 }}>
                <div>
                    <span className="detail-eyebrow mono">ISBD · ÍNDICE DE SALUD · 0.30(IP)+0.35(IM)+0.35(IA)</span>
                    <strong>{salud.isbd}<small>/100</small></strong>
                    <p>Estado global: <b style={{ color: statusInfo[estadoGlobal]?.color }}>{statusInfo[estadoGlobal]?.label}</b></p>
                </div>
                <TrafficLight status={estadoGlobal} />
                <div className="category-counts">
                    <span><i className="legend-dot normal" /><b>{salud.ip}</b>IP</span>
                    <span><i className="legend-dot normal" /><b>{salud.im}</b>IM</span>
                    <span><i className="legend-dot normal" /><b>{salud.ia}</b>IA</span>
                </div>
            </div>

            {historial.length > 1 && (
                <div className="chart-card" style={{ marginBottom: 24 }}>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={historial}>
                            <CartesianGrid stroke="var(--line)" vertical={false} />
                            <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                            <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="isbd" stroke={statusInfo[estadoGlobal]?.color} strokeWidth={3} dot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            <ComponenteReal codigo="IP · PROCESOS · PESO 30%" label="Procesos" valor={salud.ip} metricas={porComp('Procesos')} />
            <ComponenteReal codigo="IM · MEMORIA · PESO 35%" label="Memoria" valor={salud.im} metricas={porComp('Memoria')} />
            <ComponenteReal codigo="IA · ARCHIVOS · PESO 35%" label="Archivos" valor={salud.ia} metricas={porComp('Archivos')} />
        </div>
    );
}
