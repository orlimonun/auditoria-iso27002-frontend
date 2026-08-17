import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getControles, getPreguntas } from '../api/controles';
import { getAuditoria, finalizarAuditoria } from '../api/auditorias';
import { getRespuestas, guardarRespuesta } from '../api/respuestas';
import ControlPanel from '../components/ControlPanel';

export default function AuditoriaWizard() {
    const { id } = useParams();
    const navigate = useNavigate();
    const auditoriaId = Number(id);

    const [auditoria, setAuditoria] = useState(null);
    const [controles, setControles] = useState([]);
    const [respuestas, setRespuestas] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [dominioActivo, setDominioActivo] = useState(0);
    const [finalizando, setFinalizando] = useState(false);
    const [controlDetalle, setControlDetalle] = useState(null);  // NUEVO: control cuyo detalle se muestra

    const cargarTodo = async () => {
        setLoading(true);
        setError('');
        try {
            const [dataAuditoria, dataControles, dataRespuestas] = await Promise.all([
                getAuditoria(auditoriaId),
                getControles(),
                getRespuestas(auditoriaId),
            ]);

            const controlesConPreguntas = await Promise.all(
                dataControles.map(async (c) => ({
                    ...c,
                    preguntas: await getPreguntas(c.id),
                }))
            );

            const respMap = {};
            dataRespuestas.forEach((r) => {
                // CAMBIO: se guarda tambien la madurez que venga del backend
                respMap[r.preguntaId] = {
                    valor: r.respuesta ? r.respuesta.toLowerCase() : '',
                    madurez: r.nivelMadurez ?? null,   // NUEVO
                    observacion: r.observacion || '',
                };
            });

            setAuditoria(dataAuditoria);
            setControles(controlesConPreguntas);
            setRespuestas(respMap);
        } catch (err) {
            setError('No se pudo cargar la auditoría.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarTodo();
    }, [auditoriaId]);

    const dominios = useMemo(() => {
        const map = {};
        controles.forEach((c) => {
            const nombreDominio = c.dominio?.nombre || 'Sin dominio';
            if (!map[nombreDominio]) map[nombreDominio] = [];
            map[nombreDominio].push(c);
        });
        return Object.entries(map);
    }, [controles]);

    if (loading) {
        return <p style={{ color: 'var(--muted)' }}>Cargando auditoría...</p>;
    }

    if (error || !auditoria) {
        return (
            <div>
                <h1>Auditoría no encontrada</h1>
                {error && <p style={{ color: 'var(--risk-high)' }}>{error}</p>}
                <button className="btn-ghost mono" onClick={() => navigate('/app/auditorias')}>
                    Volver a Auditorías
                </button>
            </div>
        );
    }

    const totalPreguntas = controles.reduce((acc, c) => acc + c.preguntas.length, 0);
    const respondidas = Object.keys(respuestas).length;
    const progresoGlobal = totalPreguntas === 0 ? 0 : Math.round((respondidas / totalPreguntas) * 100);

    // CAMBIO: al responder Si/No/NA se conserva la madurez ya elegida
    const handleRespuesta = async (preguntaId, valor) => {
        const actual = respuestas[preguntaId] || { valor: '', madurez: null, observacion: '' };
        const nuevo = { ...actual, valor };
        setRespuestas({ ...respuestas, [preguntaId]: nuevo });
        try {
            await guardarRespuesta(auditoriaId, preguntaId, valor.toUpperCase(), nuevo.madurez, nuevo.observacion);
        } catch (err) {
            console.error('Error al guardar respuesta', err);
        }
    };

    // NUEVO: elegir el nivel de madurez (0-5) de una pregunta
    const handleMadurez = async (preguntaId, madurez) => {
        const actual = respuestas[preguntaId] || { valor: '', madurez: null, observacion: '' };
        const nuevo = { ...actual, madurez };
        setRespuestas({ ...respuestas, [preguntaId]: nuevo });
        try {
            // si aun no eligio Si/No/NA, se guarda NA por defecto para poder registrar la madurez
            const valor = nuevo.valor ? nuevo.valor.toUpperCase() : 'NA';
            await guardarRespuesta(auditoriaId, preguntaId, valor, madurez, nuevo.observacion);
        } catch (err) {
            console.error('Error al guardar madurez', err);
        }
    };

    const handleObservacion = (preguntaId, observacion) => {
        const actual = respuestas[preguntaId] || { valor: '', madurez: null, observacion: '' };
        setRespuestas({ ...respuestas, [preguntaId]: { ...actual, observacion } });
    };

    const handleObservacionBlur = async (preguntaId) => {
        const actual = respuestas[preguntaId];
        if (!actual || (!actual.valor && actual.madurez == null)) return;
        try {
            const valor = actual.valor ? actual.valor.toUpperCase() : 'NA';
            await guardarRespuesta(auditoriaId, preguntaId, valor, actual.madurez, actual.observacion);
        } catch (err) {
            console.error('Error al guardar observación', err);
        }
    };

    const progresoDominio = (controlesDominio) => {
        const preguntasDominio = controlesDominio.reduce((acc, c) => acc + c.preguntas.length, 0);
        const respondidasDominio = controlesDominio.reduce(
            (acc, c) => acc + c.preguntas.filter((p) => respuestas[p.id]?.valor).length,
            0
        );
        return preguntasDominio === 0 ? 0 : Math.round((respondidasDominio / preguntasDominio) * 100);
    };

    const handleFinalizar = async () => {
        setFinalizando(true);
        try {
            await finalizarAuditoria(auditoriaId);
            navigate('/app/auditorias');
        } catch (err) {
            setError('No se pudo finalizar la auditoría.');
        } finally {
            setFinalizando(false);
        }
    };

    const [dominioNombre, controlesDominio] = dominios[dominioActivo] || ['', []];

    return (
        <div>
            <div className="page-head">
                <div>
                    <h1>{auditoria.organizacionNombre}</h1>
                    <p style={{ color: 'var(--muted)' }}>
                        Auditor: {auditoria.auditorNombre} · Progreso global: {progresoGlobal}%
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-ghost mono" onClick={() => navigate('/app/auditorias')}>
                        Guardar y salir
                    </button>
                    {auditoria.estado !== 'FINALIZADA' && (
                        <button className="btn-primary-sm mono" onClick={handleFinalizar} disabled={finalizando}>
                            {finalizando ? 'Finalizando...' : 'Finalizar auditoría'}
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="chart-card" style={{ marginBottom: 20, borderColor: 'var(--risk-high)' }}>
                    <p style={{ color: 'var(--risk-high)' }}>{error}</p>
                </div>
            )}

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
                            <div
                                className="wizard-control-head wizard-control-head-click"
                                onClick={() => setControlDetalle(control)}
                                title="Ver descripción del control"
                            >
                                <span className="mono" style={{ color: 'var(--violet)' }}>{control.codigo}</span>
                                <h3>{control.nombre}</h3>
                            </div>
                            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 16 }}>
                                {control.objetivo}
                            </p>

                            {control.preguntas.map((p) => {
                                const r = respuestas[p.id] || { valor: '', madurez: null, observacion: '' };
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

                                        {/* NUEVO: escala de madurez 0-5 debajo de cada pregunta */}
                                        <div className="wizard-madurez">
                                            <span className="wizard-madurez-label mono">Madurez:</span>
                                            <div className="wizard-madurez-scale mono">
                                                {[0, 1, 2, 3, 4, 5].map((nivel) => (
                                                    <button
                                                        key={nivel}
                                                        type="button"
                                                        title={NIVEL_MADUREZ_DESC[nivel]}
                                                        className={`wizard-madurez-btn ${r.madurez === nivel ? 'selected' : ''}`}
                                                        onClick={() => handleMadurez(p.id, nivel)}
                                                    >
                                                        {nivel}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <textarea
                                            placeholder="Observaciones / evidencia..."
                                            value={r.observacion}
                                            onChange={(e) => handleObservacion(p.id, e.target.value)}
                                            onBlur={() => handleObservacionBlur(p.id)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* NUEVO: panel de detalle del control al hacer clic */}
            {controlDetalle && (
                <ControlPanel control={controlDetalle} onClose={() => setControlDetalle(null)} />
            )}
            {/* panel de detalle del control al hacer clic */}
            {controlDetalle && (
                <ControlPanel control={controlDetalle} onClose={() => setControlDetalle(null)} soloLectura />
            )}
        </div>
    );
}

// NUEVO: descripciones de la escala de madurez (para el tooltip de cada nivel)
const NIVEL_MADUREZ_DESC = {
    0: '0 - No existe. No hay evidencia de implementación.',
    1: '1 - Informal. Se aplica ocasionalmente, sin procedimientos.',
    2: '2 - Parcial. Prácticas documentadas pero inconsistentes.',
    3: '3 - Documentado. Definido e implementado en la mayoría de procesos.',
    4: '4 - Supervisado. Implementado y revisado periódicamente.',
    5: '5 - Mejora continua. Medido y en mejora constante.',
};