import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { mockControles } from '../mockData/controles';
import { calcularResultadosDemo } from '../utils/calcularResultadosDemo';

const NIVEL_MADUREZ_DESC = {
    0: '0 - No existe. No hay evidencia de implementación.',
    1: '1 - Informal. Se aplica ocasionalmente, sin procedimientos.',
    2: '2 - Parcial. Prácticas documentadas pero inconsistentes.',
    3: '3 - Documentado. Definido e implementado en la mayoría de procesos.',
    4: '4 - Supervisado. Implementado y revisado periódicamente.',
    5: '5 - Mejora continua. Medido y en mejora constante.',
};

function getRiskLevel(indice) {
    if (indice < 30) return { label: 'Bajo', color: 'var(--risk-low)' };
    if (indice < 60) return { label: 'Medio', color: 'var(--risk-mid)' };
    if (indice < 85) return { label: 'Alto', color: 'var(--risk-high)' };
    return { label: 'Crítico', color: 'var(--risk-critical)' };
}

// Todo el estado de esta página vive únicamente en memoria del componente
// (useState). No hay localStorage, cookies ni llamadas a la API: al recargar
// o cerrar la pestaña, todas las respuestas del visitante desaparecen.
export default function DemoInstrumento() {
    const [vista, setVista] = useState('wizard'); // 'wizard' | 'resultados'
    const [dominioActivo, setDominioActivo] = useState(0);
    const [respuestas, setRespuestas] = useState({});
    const [madurez, setMadurez] = useState({});

    const dominios = useMemo(() => {
        const map = {};
        mockControles.forEach((c) => {
            if (!map[c.dominio]) map[c.dominio] = [];
            map[c.dominio].push(c);
        });
        return Object.entries(map);
    }, []);

    const totalPreguntas = mockControles.reduce((acc, c) => acc + c.preguntas.length, 0);
    const respondidas = Object.keys(respuestas).length;
    const progresoGlobal = totalPreguntas === 0 ? 0 : Math.round((respondidas / totalPreguntas) * 100);

    const handleRespuesta = (preguntaId, valor) => {
        setRespuestas((prev) => ({ ...prev, [preguntaId]: { ...prev[preguntaId], valor } }));
    };

    const handleMadurez = (controlId, nivel) => {
        setMadurez((prev) => ({ ...prev, [controlId]: nivel }));
    };

    const handleReiniciar = () => {
        setRespuestas({});
        setMadurez({});
        setDominioActivo(0);
        setVista('wizard');
    };

    const progresoDominio = (ctrls) => {
        const preguntasDominio = ctrls.reduce((acc, c) => acc + c.preguntas.length, 0);
        const respondidasDominio = ctrls.reduce(
            (acc, c) => acc + c.preguntas.filter((p) => respuestas[p.id]?.valor).length,
            0
        );
        return preguntasDominio === 0 ? 0 : Math.round((respondidasDominio / preguntasDominio) * 100);
    };

    const resultados = useMemo(
        () => calcularResultadosDemo(mockControles, respuestas, madurez),
        [respuestas, madurez]
    );

    const [dominioNombre, controlesDominio] = dominios[dominioActivo] || ['', []];

    const dataBarras = resultados.dominios.map((d) => ({
        dominio: d.dominio.length > 14 ? d.dominio.slice(0, 14) + '…' : d.dominio,
        cumplimiento: d.cumplimiento ?? 0,
    }));

    const dataRadar = [
        { dimension: 'Confidencialidad', riesgo: resultados.riesgoC },
        { dimension: 'Integridad', riesgo: resultados.riesgoI },
        { dimension: 'Disponibilidad', riesgo: resultados.riesgoD },
    ];

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <header
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '18px 40px', borderBottom: '1px solid var(--line)',
                }}
            >
                <Link to="/" className="brand mono" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <span className="caret">&gt;_</span> Consultolocos
                </Link>
                <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.8rem' }}>
                    <span className="led"></span>
                    <span style={{ color: 'var(--muted)' }}>
                        Modo demostración · sin cuenta · nada se guarda al salir
                    </span>
                    <Link to="/login" className="btn-ghost mono" style={{ padding: '8px 16px' }}>
                        Iniciar sesión
                    </Link>
                </div>
            </header>

            <div className="app-content" style={{ maxWidth: 1200, margin: '0 auto' }}>
                <div className="page-head">
                    <div>
                        <h1>Instrumento de evaluación ISO/IEC 27002 — Demo</h1>
                        <p style={{ color: 'var(--muted)' }}>
                            Explora libremente el instrumento con un catálogo de controles de ejemplo.
                            Progreso: {progresoGlobal}%
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn-ghost mono" onClick={handleReiniciar}>
                            Reiniciar demo
                        </button>
                        <button
                            className="btn-primary-sm mono"
                            onClick={() => setVista(vista === 'wizard' ? 'resultados' : 'wizard')}
                        >
                            {vista === 'wizard' ? 'Ver resultados' : 'Volver al cuestionario'}
                        </button>
                    </div>
                </div>

                {vista === 'wizard' ? (
                    <div className="wizard-layout">
                        <aside className="wizard-steps">
                            {dominios.map(([dominio, ctrls], i) => {
                                const pct = progresoDominio(ctrls);
                                return (
                                    <button
                                        key={dominio}
                                        className={`wizard-step ${i === dominioActivo ? 'active' : ''}`}
                                        onClick={() => setDominioActivo(i)}
                                    >
                                        <div className="wizard-step-top">
                                            <span>{dominio}</span>
                                            <span className="mono" style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>
                                                {pct}%
                                            </span>
                                        </div>
                                        <div className="wizard-step-track">
                                            <div
                                                className="wizard-step-fill"
                                                style={{ width: `${pct}%`, background: pct === 100 ? 'var(--risk-low)' : 'var(--violet)' }}
                                            />
                                        </div>
                                    </button>
                                );
                            })}
                        </aside>

                        <div className="wizard-content">
                            {controlesDominio.map((control) => (
                                <div key={control.id} className="wizard-control-card">
                                    <div className="wizard-control-head">
                                        <span className="mono" style={{ color: 'var(--violet)' }}>{control.codigo}</span>
                                        <h3>{control.nombre}</h3>
                                    </div>
                                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 16 }}>
                                        {control.objetivo}
                                    </p>

                                    {control.preguntas.map((p) => {
                                        const r = respuestas[p.id] || { valor: '' };
                                        return (
                                            <div key={p.id} className="wizard-question">
                                                <p className="wizard-question-text">{p.texto}</p>
                                                <div className="wizard-options mono">
                                                    {['si', 'no', 'na'].map((opt) => (
                                                        <button
                                                            key={opt}
                                                            type="button"
                                                            className={`wizard-option ${r.valor === opt ? 'selected ' + opt : ''}`}
                                                            onClick={() => handleRespuesta(p.id, opt)}
                                                        >
                                                            {opt === 'si' ? 'Sí' : opt === 'no' ? 'No' : 'N/A'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <div className="wizard-madurez">
                                        <span className="wizard-madurez-label mono">Madurez del control:</span>
                                        <div className="wizard-madurez-scale mono">
                                            {[0, 1, 2, 3, 4, 5].map((nivel) => (
                                                <button
                                                    key={nivel}
                                                    type="button"
                                                    title={NIVEL_MADUREZ_DESC[nivel]}
                                                    className={`wizard-madurez-btn ${madurez[control.id] === nivel ? 'selected' : ''}`}
                                                    onClick={() => handleMadurez(control.id, nivel)}
                                                >
                                                    {nivel}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
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
                                    {resultados.riesgoC}
                                </span>
                            </div>
                            <div className="kpi-card">
                                <span className="kpi-label mono">Riesgo integridad</span>
                                <span className="kpi-value" style={{ color: getRiskLevel(resultados.riesgoI).color }}>
                                    {resultados.riesgoI}
                                </span>
                            </div>
                            <div className="kpi-card">
                                <span className="kpi-label mono">Riesgo disponibilidad</span>
                                <span className="kpi-value" style={{ color: getRiskLevel(resultados.riesgoD).color }}>
                                    {resultados.riesgoD}
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
                                    const nivel = getRiskLevel(c.riesgoControl);
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
                                        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Sin datos aún, responde algunas preguntas.</p>
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
                                        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Sin datos aún, responde algunas preguntas.</p>
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

                        <div className="chart-card" style={{ marginTop: 20, textAlign: 'center' }}>
                            <p style={{ color: 'var(--muted)', marginBottom: 12 }}>
                                Esto fue solo una vista previa. Crea una cuenta para auditar tu organización, exportar reportes en PDF y guardar el historial de auditorías.
                            </p>
                            <Link to="/login" className="btn-primary-sm mono">Crear cuenta / Iniciar sesión</Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}