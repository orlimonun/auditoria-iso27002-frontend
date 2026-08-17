import { useState, useEffect } from 'react';
import { getAuditorias } from '../api/auditorias';
import { getResultados } from '../api/resultados';
import { exportarReporteEjecutivo } from '../utils/exportarReporte';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';

function getRiskLevel(indice) {
    if (indice < 30) return { label: 'Bajo', color: 'var(--risk-low)' };
    if (indice < 60) return { label: 'Medio', color: 'var(--risk-mid)' };
    if (indice < 85) return { label: 'Alto', color: 'var(--risk-high)' };
    return { label: 'Crítico', color: 'var(--risk-critical)' };
}

export default function Resultados() {
    const [auditorias, setAuditorias] = useState([]);
    const [auditoriaId, setAuditoriaId] = useState('');
    const [resultados, setResultados] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const cargarAuditorias = async () => {
            try {
                const data = await getAuditorias();
                setAuditorias(data);
                if (data.length > 0) setAuditoriaId(data[0].id);
            } catch (err) {
                setError('No se pudieron cargar las auditorías.');
            } finally {
                setLoading(false);
            }
        };
        cargarAuditorias();
    }, []);

    useEffect(() => {
        if (!auditoriaId) return;
        const cargarResultados = async () => {
            setError('');
            try {
                const data = await getResultados(auditoriaId);
                setResultados(data);
            } catch (err) {
                setError('No se pudieron calcular los resultados.');
            }
        };
        cargarResultados();
    }, [auditoriaId]);

    const auditoria = auditorias.find((a) => a.id === Number(auditoriaId));

    if (loading) {
        return <p style={{ color: 'var(--muted)' }}>Cargando...</p>;
    }

    if (auditorias.length === 0) {
        return (
            <div>
                <h1>Resultados</h1>
                <p style={{ color: 'var(--muted)' }}>No hay auditorías disponibles todavía.</p>
            </div>
        );
    }

    const dataBarras = resultados
        ? resultados.dominios.map((d) => ({
            dominio: d.dominio.length > 14 ? d.dominio.slice(0, 14) + '…' : d.dominio,
            cumplimiento: d.cumplimiento ?? 0,
        }))
        : [];

    const dataRadar = resultados
        ? [
            { dimension: 'Confidencialidad', riesgo: resultados.riesgoC },
            { dimension: 'Integridad', riesgo: resultados.riesgoI },
            { dimension: 'Disponibilidad', riesgo: resultados.riesgoD },
        ]
        : [];

    const handleExportarPDF = () => {
        if (!auditoria || !resultados) return;
        exportarReporteEjecutivo(
            {
                organizacion: auditoria.organizacionNombre,
                auditor: auditoria.auditorNombre,
                fechaInicio: auditoria.fecha,
            },
            {
                madurezPromedioGeneral: resultados.madurezPromedioGeneral,
                riesgoC: resultados.riesgoC,
                riesgoI: resultados.riesgoI,
                riesgoD: resultados.riesgoD,
                cumplimientoPorDominio: resultados.dominios.map((d) => ({
                    dominio: d.dominio,
                    cumplimiento: d.cumplimiento,
                    madurezPromedio: d.madurezPromedio,
                })),
                menorMadurez: resultados.menorMadurez.map((c) => ({
                    codigo: c.codigo,
                    nombre: c.nombre,
                    madurez: c.nivelMadurez,
                })),
                mayorRiesgo: resultados.mayorRiesgo.map((c) => ({
                    codigo: c.codigo,
                    nombre: c.nombre,
                    pctNo: c.riesgoControl,
                })),
            }
        );
    };

    return (
        <div>
            <div className="page-head">
                <div>
                    <h1>Resultados</h1>
                    <p style={{ color: 'var(--muted)' }}>
                        Indicadores de cumplimiento, madurez y exposición al riesgo
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <select
                        className="mono"
                        value={auditoriaId}
                        onChange={(e) => setAuditoriaId(e.target.value)}
                        style={{
                            background: 'var(--bg-2)',
                            border: '1px solid var(--line)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '9px 14px',
                            color: 'var(--text)',
                        }}
                    >
                        {auditorias.map((a) => (
                            <option key={a.id} value={a.id}>{a.organizacionNombre} — {a.fecha}</option>
                        ))}
                    </select>
                    <button className="btn-primary-sm mono" onClick={handleExportarPDF} disabled={!resultados}>
                        ⬇ Exportar PDF
                    </button>
                </div>
            </div>

            {error && (
                <div className="chart-card" style={{ marginBottom: 20, borderColor: 'var(--risk-high)' }}>
                    <p style={{ color: 'var(--risk-high)' }}>{error}</p>
                </div>
            )}

            {!resultados ? (
                <p style={{ color: 'var(--muted)' }}>Cargando resultados...</p>
            ) : (
                <>
                    <div className="kpi-grid">
                        <div className="kpi-card">
                            <span className="kpi-label mono">Madurez promedio</span>
                            <span className="kpi-value">{resultados.madurezPromedioGeneral.toFixed(1)}<span className="kpi-unit">/5</span></span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-label mono">Riesgo confidencialidad</span>
                            <span className="kpi-value" style={{ color: getRiskLevel(resultados.riesgoC).color }}>
                {resultados.riesgoC.toFixed(0)}
              </span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-label mono">Riesgo integridad</span>
                            <span className="kpi-value" style={{ color: getRiskLevel(resultados.riesgoI).color }}>
                {resultados.riesgoI.toFixed(0)}
              </span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-label mono">Riesgo disponibilidad</span>
                            <span className="kpi-value" style={{ color: getRiskLevel(resultados.riesgoD).color }}>
                {resultados.riesgoD.toFixed(0)}
              </span>
                        </div>
                    </div>

                    <div className="section-block">
                        <div className="section-block-head">
                            <h2>Cumplimiento por dominio</h2>
                        </div>
                        <div className="chart-card">
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={dataBarras} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                                    <XAxis dataKey="dominio" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                                    <YAxis domain={[0, 100]} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }}
                                        labelStyle={{ color: 'var(--text)' }}
                                        formatter={(value) => [`${value}%`, 'Cumplimiento']}
                                    />
                                    <Bar dataKey="cumplimiento" fill="#b490ff" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="section-block">
                        <div className="section-block-head">
                            <h2>Exposición al riesgo por dimensión</h2>
                        </div>
                        <div className="chart-card">
                            <ResponsiveContainer width="100%" height={280}>
                                <RadarChart data={dataRadar}>
                                    <PolarGrid stroke="var(--line)" />
                                    <PolarAngleAxis dataKey="dimension" tick={{ fill: 'var(--text)', fontSize: 12 }} />
                                    <PolarRadiusAxis domain={[0, 100]} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                                    <Radar name="Riesgo" dataKey="riesgo" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.25} />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }}
                                        formatter={(value) => [`${value}%`, 'Riesgo']}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="section-block">
                        <div className="section-block-head">
                            <h2>Mapa de calor de riesgo por control</h2>
                        </div>
                        <div className="heatmap-grid">
                            {resultados.controles.map((c) => {
                                const nivel = getRiskLevel(c.riesgoControl * 10); // riesgoControl esta en escala 0-peso, aproximamos visualmente
                                return (
                                    <div
                                        key={c.controlId}
                                        className="heatmap-cell"
                                        style={{ background: `${nivel.color}22`, borderColor: nivel.color }}
                                        title={`${c.codigo} — ${c.nombre}`}
                                    >
                                        <span className="mono heatmap-code">{c.codigo}</span>
                                        <span className="heatmap-nombre">{c.nombre}</span>
                                        <span className="mono heatmap-pct" style={{ color: nivel.color }}>
                      Madurez {c.nivelMadurez}/5
                    </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="rankings-grid">
                        <div className="section-block" style={{ margin: 0 }}>
                            <div className="section-block-head">
                                <h2>Menor nivel de madurez</h2>
                            </div>
                            <div className="ranking-list">
                                {resultados.menorMadurez.length === 0 && (
                                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Sin datos aún</p>
                                )}
                                {resultados.menorMadurez.map((c) => (
                                    <div key={c.controlId} className="ranking-item">
                                        <span className="mono">{c.codigo}</span>
                                        <span>{c.nombre}</span>
                                        <span className="mono ranking-badge">{c.nivelMadurez}/5</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="section-block" style={{ margin: 0 }}>
                            <div className="section-block-head">
                                <h2>Mayor exposición al riesgo</h2>
                            </div>
                            <div className="ranking-list">
                                {resultados.mayorRiesgo.length === 0 && (
                                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Sin datos aún</p>
                                )}
                                {resultados.mayorRiesgo.map((c) => (
                                    <div key={c.controlId} className="ranking-item">
                                        <span className="mono">{c.codigo}</span>
                                        <span>{c.nombre}</span>
                                        <span className="mono ranking-badge">{c.riesgoControl.toFixed(1)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}