import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuditorias, crearAuditoria } from '../api/auditorias';
import { getOrganizaciones } from '../api/organizaciones';

export default function Auditorias() {
    const [auditorias, setAuditorias] = useState([]);
    const [organizaciones, setOrganizaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [organizacionId, setOrganizacionId] = useState('');
    const [creando, setCreando] = useState(false);
    const navigate = useNavigate();

    const cargarDatos = async () => {
        setLoading(true);
        setError('');
        try {
            const [dataAuditorias, dataOrganizaciones] = await Promise.all([
                getAuditorias(),
                getOrganizaciones(),
            ]);
            setAuditorias(dataAuditorias);
            setOrganizaciones(dataOrganizaciones);
        } catch (err) {
            setError('No se pudieron cargar las auditorías. ¿El backend está corriendo?');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!organizacionId) return;
        setCreando(true);
        try {
            const nueva = await crearAuditoria(Number(organizacionId));
            setShowForm(false);
            setOrganizacionId('');
            navigate(`/app/auditorias/${nueva.id}`);
        } catch (err) {
            setError('No se pudo crear la auditoría.');
        } finally {
            setCreando(false);
        }
    };

    return (
        <div>
            <div className="page-head">
                <div>
                    <h1>Auditorías</h1>
                    <p style={{ color: 'var(--muted)' }}>
                        Evaluaciones de controles ISO/IEC 27002 en curso o finalizadas
                    </p>
                </div>
                <button className="btn-primary-sm mono" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancelar' : '+ Nueva auditoría'}
                </button>
            </div>

            {error && (
                <div className="chart-card" style={{ marginBottom: 20, borderColor: 'var(--risk-high)' }}>
                    <p style={{ color: 'var(--risk-high)' }}>{error}</p>
                </div>
            )}

            {showForm && (
                <form className="inline-form" onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-field">
                            <label className="mono">Organización</label>
                            <select value={organizacionId} onChange={(e) => setOrganizacionId(e.target.value)} required>
                                <option value="">Seleccione...</option>
                                {organizaciones.map((o) => (
                                    <option key={o.id} value={o.id}>{o.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="btn-primary mono"
                        style={{ marginTop: 16, width: 'auto', padding: '10px 24px' }}
                        disabled={creando}
                    >
                        {creando ? 'Creando...' : 'Iniciar auditoría'}
                    </button>
                </form>
            )}

            {loading ? (
                <p style={{ color: 'var(--muted)' }}>Cargando auditorías...</p>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                        <tr>
                            <th>Organización</th>
                            <th>Auditor</th>
                            <th>Fecha inicio</th>
                            <th>Estado</th>
                            <th></th>
                        </tr>
                        </thead>
                        <tbody>
                        {auditorias.map((a) => (
                            <tr key={a.id}>
                                <td className="cell-strong">{a.organizacionNombre}</td>
                                <td>{a.auditorNombre}</td>
                                <td className="mono">{a.fecha}</td>
                                <td>
                    <span className={`audit-tag mono ${a.estado === 'FINALIZADA' ? 'completada' : 'en_progreso'}`}>
                      {a.estado === 'FINALIZADA' ? 'Finalizada' : 'Borrador'}
                    </span>
                                </td>
                                <td>
                                    <button className="btn-ghost mono" onClick={() => navigate(`/app/auditorias/${a.id}`)}>
                                        {a.estado === 'FINALIZADA' ? 'Ver' : 'Continuar'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {auditorias.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>
                                    No hay auditorías registradas
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}