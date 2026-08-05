import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuditorias } from '../api/auditorias';
import { getOrganizaciones } from '../api/organizaciones';
import { getResultados } from '../api/resultados';

function getRiskLevel(indice) {
    if (indice < 30) return { label: 'Bajo', color: 'var(--risk-low)' };
    if (indice < 60) return { label: 'Medio', color: 'var(--risk-mid)' };
    if (indice < 85) return { label: 'Alto', color: 'var(--risk-high)' };
    return { label: 'Crítico', color: 'var(--risk-critical)' };
}

export default function Dashboard() {
    const navigate = useNavigate();
    const [auditorias, setAuditorias] = useState([]);
    const [organizaciones, setOrganizaciones] = useState([]);
    const [resumen, setResumen] = useState({ madurezPromedio: 0, riesgoPromedio: 0 });
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

                if (dataAuditorias.length > 0) {
                    const resultados = await Promise.all(
                        dataAuditorias.map((a) => getResultados(a.id).catch(() => null))
                    );
                    const validos = resultados.filter((r) => r && r.controles.length > 0);
                    const madurezPromedio = validos.length
                        ? validos.reduce((acc, r) => acc + r.madurezPromedioGeneral, 0) / validos.length
                        : 0;
                    const riesgoPromedio = validos.length
                        ? validos.reduce((acc, r) => acc + r.indiceGeneralRiesgo, 0) / validos.length
                        : 0;
                    setResumen({ madurezPromedio, riesgoPromedio });
                }
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
    const riesgo = getRiskLevel(resumen.riesgoPromedio);
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
                    <span className="kpi-label mono">Madurez promedio</span>
                    <span className="kpi-value">{resumen.madurezPromedio.toFixed(1)}<span className="kpi-unit">/5</span></span>
                </div>

                <div className="kpi-card kpi-risk" style={{ borderColor: riesgo.color }}>
                    <span className="kpi-label mono">Índice de riesgo global</span>
                    <span className="kpi-value" style={{ color: riesgo.color }}>
            {resumen.riesgoPromedio.toFixed(0)}
          </span>
                    <span className="kpi-badge mono" style={{ background: `${riesgo.color}22`, color: riesgo.color }}>
            {riesgo.label}
          </span>
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