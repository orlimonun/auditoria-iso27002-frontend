import { useEffect, useState } from 'react';
import {
    Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { getSaludOracle, getEstadoOracle } from '../api/monitoreoOracle';
import '../styles/monitoreo.css';

// Reutiliza la misma estetica del monitor: estados y colores
const statusInfo = {
    optimal:  { label: 'Óptimo',    color: '#22c55e' },
    healthy:  { label: 'Saludable', color: '#22c55e' },
    warning:  { label: 'Advertencia', color: '#f59e0b' },
    degraded: { label: 'Degradado', color: '#f97316' },
    critical: { label: 'Crítico',   color: '#ef4444' },
    normal:   { label: 'Normal',    color: '#22c55e' },
};

const metricStatusLabel = {
    normal: 'Normal', warning: 'Advertencia', degraded: 'Alto', critical: 'Crítico',
};

// Semáforo (igual al del monitor original)
function TrafficLight({ status, compact }) {
    const activeLamp = status === 'normal' || status === 'optimal' || status === 'healthy'
        ? 'green'
        : status === 'warning' ? 'yellow' : 'red';
    return (
        <span className={`monitor-traffic ${compact ? 'compact' : ''}`} aria-label={`Estado ${statusInfo[status]?.label || status}`}>
            {['red', 'yellow', 'green'].map((lamp) => (
                <i key={lamp} className={`monitor-traffic-light ${activeLamp === lamp ? 'is-active' : ''} ${lamp}`} />
            ))}
        </span>
    );
}

// Tarjeta de una métrica real (misma estructura visual que MetricCard)
function MetricCardReal({ metrica }) {
    const status = metrica.estado || 'normal';
    return (
        <article className={`metric-card status-${status}`}>
            <header>
                <div>
                    <span className="metric-status"><i />{metricStatusLabel[status] || 'Normal'}</span>
                    <h4>{metrica.label}</h4>
                </div>
                <TrafficLight status={status} compact />
            </header>
            <div className="metric-current"><strong>{metrica.valor}</strong></div>
        </article>
    );
}

// Indicador de componente (Procesos / Memoria / Archivos)
function ComponenteReal({ codigo, label, valor, metricas }) {
    const status = valor < 40 ? 'critical' : valor < 60 ? 'degraded' : valor < 75 ? 'warning' : 'normal';
    return (
        <div className="category-detail">
            <div className={`category-summary status-${status}`}>
                <div>
                    <span className="detail-eyebrow mono">{codigo}</span>
                    <strong>{valor}<small>/100</small></strong>
                    <p>Indicador de {label} calculado desde métricas reales de Oracle.</p>
                </div>
                <TrafficLight status={status} />
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
            // acumular historial en memoria para el gráfico (últimos 12 puntos)
            setHistorial((prev) => {
                const ahora = new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
                const nuevo = [...prev, { hora: ahora, isbd: data.isbd }];
                return nuevo.slice(-12);
            });
        } catch (err) {
            setError('No se pudo leer la salud de Oracle. ¿El backend está conectado a la base?');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargar();
        const intervalo = setInterval(cargar, 15000); // refresca cada 15 s
        return () => clearInterval(intervalo);
    }, []);

    if (loading) {
        return <p style={{ color: 'var(--muted)' }}>Conectando con la instancia Oracle...</p>;
    }

    if (error || !salud) {
        return (
            <div>
                <div className="monitor-section-title">
                    <div><span className="mono">MONITOR ORACLE</span><h2>Salud de la base de datos</h2></div>
                </div>
                <div className="chart-card" style={{ borderColor: 'var(--risk-high, #ef4444)' }}>
                    <p style={{ color: 'var(--risk-high, #ef4444)' }}>{error || 'Sin datos'}</p>
                </div>
            </div>
        );
    }

    const estadoGlobal = salud.estado || 'healthy';

    // Agrupar métricas por componente
    const porComp = (comp) => (salud.metricas || []).filter((m) => m.componente === comp);

    return (
        <div>
            <div className="monitor-section-title">
                <div>
                    <span className="mono">MONITOR ORACLE · EN VIVO</span>
                    <h2>Salud de la instancia Oracle</h2>
                </div>
                <b>{salud.isbd}</b>
            </div>

            {/* Índice de salud global */}
            <div className={`category-summary status-${estadoGlobal}`} style={{ marginBottom: 20 }}>
                <div>
                    <span className="detail-eyebrow mono">ISBD · ÍNDICE DE SALUD</span>
                    <strong>{salud.isbd}<small>/100</small></strong>
                    <p>Estado global: <b style={{ color: statusInfo[estadoGlobal]?.color }}>{statusInfo[estadoGlobal]?.label}</b></p>
                </div>
                <TrafficLight status={estadoGlobal} />
                <div className="category-counts">
                    <span><i className="legend-dot normal" /><b>IP</b> {salud.ip}</span>
                    <span><i className="legend-dot normal" /><b>IM</b> {salud.im}</span>
                    <span><i className="legend-dot normal" /><b>IA</b> {salud.ia}</span>
                </div>
            </div>

            {/* Histórico del ISBD (se va llenando en vivo) */}
            {historial.length > 1 && (
                <div className="chart-card" style={{ marginBottom: 20 }}>
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

            {/* Los tres componentes con sus métricas reales */}
            <ComponenteReal codigo="IP · PROCESOS" label="Procesos" valor={salud.ip} metricas={porComp('Procesos')} />
            <ComponenteReal codigo="IM · MEMORIA" label="Memoria" valor={salud.im} metricas={porComp('Memoria')} />
            <ComponenteReal codigo="IA · ARCHIVOS" label="Archivos" valor={salud.ia} metricas={porComp('Archivos')} />
        </div>
    );
}
