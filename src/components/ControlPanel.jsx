import { useState, useEffect } from 'react';
import { getPreguntas, crearPregunta } from '../api/controles';

export default function ControlPanel({ control, onClose, soloLectura = false }) {
    const [preguntas, setPreguntas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [nuevaPregunta, setNuevaPregunta] = useState('');
    const [guardando, setGuardando] = useState(false);

    const cargarPreguntas = async () => {
        if (!control) return;
        setLoading(true);
        try {
            const data = await getPreguntas(control.id);
            setPreguntas(data);
        } catch (err) {
            console.error('Error al cargar preguntas', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarPreguntas();
    }, [control]);

    if (!control) return null;

    const handleAddPregunta = async (e) => {
        e.preventDefault();
        if (!nuevaPregunta.trim()) return;
        setGuardando(true);
        try {
            await crearPregunta(control.id, nuevaPregunta.trim());
            setNuevaPregunta('');
            await cargarPreguntas();
        } catch (err) {
            console.error('Error al crear pregunta', err);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <>
            <div className="drawer-overlay" onClick={onClose} />
            <div className="drawer">
                <div className="drawer-head">
                    <div>
                        <span className="mono drawer-code">{control.codigo}</span>
                        <h2>{control.nombre}</h2>
                    </div>
                    <button className="drawer-close" onClick={onClose}>✕</button>
                </div>

                <div className="drawer-body">
                    <div className="drawer-section">
                        <span className="drawer-label mono">Dominio</span>
                        <p>{control.dominio?.nombre}</p>
                    </div>

                    <div className="drawer-section">
                        <span className="drawer-label mono">Objetivo</span>
                        <p>{control.objetivo}</p>
                    </div>

                    <div className="drawer-section">
                        <span className="drawer-label mono">Descripción</span>
                        <p>{control.descripcion}</p>
                    </div>

                    <div className="drawer-section">
                        <span className="drawer-label mono">Impacto</span>
                        <div className="cid-tags">
                            {control.afectaC && <span className="cid-tag c">Confidencialidad</span>}
                            {control.afectaI && <span className="cid-tag i">Integridad</span>}
                            {control.afectaD && <span className="cid-tag d">Disponibilidad</span>}
                        </div>
                    </div>

                    <div className="drawer-section">
                        <span className="drawer-label mono">Peso del control</span>
                        <p className="mono">{control.peso} / 5</p>
                    </div>

                    <div className="drawer-section">
            <span className="drawer-label mono">
              Preguntas ({preguntas.length})
            </span>

                        {loading ? (
                            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Cargando...</p>
                        ) : (
                            <div className="preguntas-list">
                                {preguntas.map((p, i) => (
                                    <div key={p.id} className="pregunta-item">
                                        <span className="mono pregunta-num">{i + 1}.</span>
                                        <span>{p.texto}</span>
                                    </div>
                                ))}
                                {preguntas.length === 0 && (
                                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                                        Sin preguntas registradas
                                    </p>
                                )}
                            </div>
                        )}

                        {!soloLectura && (
                            <form className="add-pregunta-form" onSubmit={handleAddPregunta}>
                                <input
                                    placeholder="Nueva pregunta para este control..."
                                    value={nuevaPregunta}
                                    onChange={(e) => setNuevaPregunta(e.target.value)}
                                    disabled={guardando}
                                />
                                <button type="submit" className="mono" disabled={guardando}>+</button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}