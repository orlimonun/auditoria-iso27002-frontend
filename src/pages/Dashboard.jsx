import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuditorias } from '../api/auditorias';
import { getOrganizaciones } from '../api/organizaciones';

export default function Dashboard() {
    const navigate = useNavigate();
    const [auditorias, setAuditorias] = useState([]);
    const [organizaciones, setOrganizaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const cargar = async () => {
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
                setError('No se pudo cargar la información del dashboard.');
            } finally {
                setLoading(false);
            }
        };
        cargar();
    }, []);

    if (loading) {
        return <p style={{ color: 'var(--muted)' }}>Cargando...</p>;
    }

    const auditoriasActivas = auditorias.filter((a) => a.estado !== 'FINALIZADA').length;
    const auditoriasFinalizadas = auditorias.filter((a) => a.estado === 'FINALIZADA').length;
    const recientes = [...auditorias]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 5);

    return (
        <div>
            <h1>Dashboard</h1>
            <p style={{ color: 'var(--muted)', marginBottom: 28 }}>
                Resumen general del estado de las auditorías
            </p>

            {error && (
                <div className="chart-card" style={{ marginBottom: 20, borderColor: 'var(--risk-high)' }}>
                    <p style={{ color: 'var(--risk-high)' }}>{error}</p>
                </div>
            )}

            <div className="kpi-grid">
                <div className="kpi-card">
                    <span className="kpi-label mono">Auditorías activas</span>
                    <span className="kpi-value">{auditoriasActivas}</span>
                </div>

                <div className="kpi-card">
                    <span className="kpi-label mono">Auditorías finalizadas</span>
                    <span className="kpi-value">{auditoriasFinalizadas}</span>
                </div>

                <div className="kpi-card">
                    <span className="kpi-label mono">Organizaciones evaluadas</span>
                    <span className="kpi-value">{organizaciones.length}</span>
                </div>
            </div>

            <div className="section-block">
                <div className="section-block-head">
                    <h2>Auditorías recientes</h2>
                    <button className="btn-ghost mono" onClick={() => navigate('/app/auditorias')}>
                        Ver todas
                    </button>
                </div>

                <div className="audit-list">
                    {recientes.map((a) => (
                        <div key={a.id} className="audit-row">
                            <div className="audit-row-main">
                                <span className="audit-org">{a.organizacionNombre}</span>
                                <span className="audit-meta mono">
                  {a.auditorNombre} · {a.fecha}
                </span>
                            </div>

                            <div className="audit-row-status">
                <span
                    className={`audit-tag mono ${a.estado === 'FINALIZADA' ? 'completada' : 'en_progreso'}`}
                >
                  {a.estado === 'FINALIZADA' ? 'Finalizada' : 'Borrador'}
                </span>
                            </div>

                            <button className="btn-ghost mono" onClick={() => navigate(`/app/auditorias/${a.id}`)}>
                                Ver
                            </button>
                        </div>
                    ))}
                    {recientes.length === 0 && (
                        <p style={{ color: 'var(--muted)', padding: 20, textAlign: 'center' }}>
                            No hay auditorías registradas todavía
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}