import { useState, useEffect, useMemo } from 'react';
import { getAuditorias } from '../api/auditorias';
import { getResultados } from '../api/resultados';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

function getRiskLevel(indice) {
    if (indice < 30) return { label: 'Bajo', color: 'var(--risk-low)' };
    if (indice < 60) return { label: 'Medio', color: 'var(--risk-mid)' };
    if (indice < 85) return { label: 'Alto', color: 'var(--risk-high)' };
    return { label: 'Crítico', color: 'var(--risk-critical)' };
}

export default function Historico() {
    const [auditorias, setAuditorias] = useState([]);
    const [organizacion, setOrganizacion] = useState('');
    const [resultadosPorAuditoria, setResultadosPorAuditoria] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const cargar = async () => {
            setLoading(true);
            setError('');
            try {
                const data = await getAuditorias();
                setAuditorias(data);
                if (data.length > 0) setOrganizacion(data[0].organizacionNombre);
            } catch (err) {
                setError('No se pudieron cargar las auditorías.');
            } finally {
                setLoading(false);
            }
        };
        cargar();
    }, []);

    const organizaciones = useMemo(() => {
        return [...new Set(auditorias.map((a) => a.organizacionNombre))];
    }, [auditorias]);

    const auditoriasOrg = useMemo(() => {
        return auditorias
            .filter((a) => a.organizacionNombre === organizacion)
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    }, [auditorias, organizacion]);

    useEffect(() => {
        if (auditoriasOrg.length < 2) return;
        const cargarResultados = async () => {
            try {
                const entries = await Promise.all(
                    auditoriasOrg.map(async (a) => [a.id, await getResultados(a.id)])
                );
                setResultadosPorAuditoria(Object.fromEntries(entries));
            } catch (err) {
                setError('No se pudieron calcular los resultados históricos.');
            }
        };
        cargarResultados();
    }, [auditoriasOrg]);

    const dataComparativa = auditoriasOrg.map((a) => {
        const r = resultadosPorAuditoria[a.id];
        return {
            fecha: a.fecha,
            madurez: r ? Number(r.madurezPromedioGeneral.toFixed(1)) : 0,
            riesgo: r ? Math.round(r.indiceGeneralRiesgo) : 0,
        };
    });

    if (loading) {
        return <p style={{ color: 'var(--muted)' }}>Cargando...</p>;
    }

    return (
        <div>
            <div className="page-head">
                <div>
                    <h1>Histórico comparativo</h1>
                    <p style={{ color: 'var(--muted)' }}>
                        Evolución de la madurez y el riesgo entre auditorías de una misma organización
                    </p>
                </div>
                {organizaciones.length > 0 && (
                    <select
                        className="mono"
                        value={organizacion}
                        onChange={(e) => setOrganizacion(e.target.value)}
                        style={{
                            background: 'var(--bg-2)',
                            border: '1px solid var(--line)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '9px 14px',
                            color: 'var(--text)',
                        }}
                    >
                        {organizaciones.map((o) => (
                            <option key={o} value={o}>{o}</option>
                        ))}
                    </select>
                )}
            </div>

            {error && (
                <div className="chart-card" style={{ marginBottom: 20, borderColor: 'var(--risk-high)' }}>
                    <p style={{ color: 'var(--risk-high)' }}>{error}</p>
                </div>
            )}

            {auditorias.length === 0 && (
                <div className="chart-card">
                    <p style={{ color: 'var(--muted)' }}>No hay auditorías registradas todavía.</p>
                </div>
            )}

            {auditorias.length > 0 && auditoriasOrg.length < 2 && (
                <div className="chart-card" style={{ marginBottom: 24 }}>
                    <p style={{ color: 'var(--muted)' }}>
                        Esta organización solo tiene una auditoría registrada. Se necesitan al menos dos
                        auditorías en fechas distintas para mostrar una comparación histórica.
                    </p>
                </div>
            )}

            {auditoriasOrg.length >= 2 && (
                <>
                    <div className="section-block">
                        <div className="section-block-head">
                            <h2>Evolución en el tiempo</h2>
                        </div>
                        <div className="chart-card">
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={dataComparativa} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                                    <XAxis dataKey="fecha" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                                    <YAxis domain={[0, 100]} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }}
                                        labelStyle={{ color: 'var(--text)' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                    <Line type="monotone" dataKey="madurez" name="Madurez (0-5)" stroke="#60a5fa" strokeWidth={2} dot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="riesgo" name="Índice de riesgo (0-100)" stroke="#f87171" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="section-block">
                        <div className="section-block-head">
                            <h2>Detalle por auditoría</h2>
                        </div>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Auditor</th>
                                    <th>Madurez promedio</th>
                                    <th>Índice de riesgo</th>
                                    <th>Nivel</th>
                                </tr>
                                </thead>
                                <tbody>
                                {auditoriasOrg.map((a) => {
                                    const r = resultadosPorAuditoria[a.id];
                                    const nivel = r ? getRiskLevel(r.indiceGeneralRiesgo) : null;
                                    return (
                                        <tr key={a.id}>
                                            <td className="mono cell-strong">{a.fecha}</td>
                                            <td>{a.auditorNombre}</td>
                                            <td className="mono">{r ? `${r.madurezPromedioGeneral.toFixed(1)} / 5` : '—'}</td>
                                            <td className="mono">{r ? `${Math.round(r.indiceGeneralRiesgo)}%` : '—'}</td>
                                            <td>
                                                {nivel && <span className="mono" style={{ color: nivel.color }}>{nivel.label}</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}