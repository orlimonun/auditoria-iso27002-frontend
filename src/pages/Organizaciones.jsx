import { useState, useEffect } from 'react';
import {
    getOrganizaciones,
    crearOrganizacion,
    eliminarOrganizacion,
} from '../api/organizaciones';

const emptyForm = {
    nombre: '',
    areaEvaluada: '',
    dbaNombre: '',
};

export default function Organizaciones() {
    const [organizaciones, setOrganizaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [guardando, setGuardando] = useState(false);

    const cargarOrganizaciones = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getOrganizaciones();
            setOrganizaciones(data);
        } catch (err) {
            setError('No se pudieron cargar las organizaciones. ¿El backend está corriendo?');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarOrganizaciones();
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            await crearOrganizacion(form);
            setForm(emptyForm);
            setShowForm(false);
            await cargarOrganizaciones();
        } catch (err) {
            setError('No se pudo guardar la organización.');
        } finally {
            setGuardando(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await eliminarOrganizacion(id);
            setOrganizaciones(organizaciones.filter((o) => o.id !== id));
        } catch (err) {
            setError('No se pudo eliminar la organización.');
        }
    };

    return (
        <div>
            <div className="page-head">
                <div>
                    <h1>Organizaciones</h1>
                    <p style={{ color: 'var(--muted)' }}>
                        Empresas y entidades evaluadas en el proceso de auditoría
                    </p>
                </div>
                <button className="btn-primary-sm mono" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancelar' : '+ Nueva organización'}
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
                            <input name="nombre" value={form.nombre} onChange={handleChange} required />
                        </div>
                        <div className="form-field">
                            <label className="mono">Área evaluada</label>
                            <input name="areaEvaluada" value={form.areaEvaluada} onChange={handleChange} required />
                        </div>
                        <div className="form-field">
                            <label className="mono">Administrador de BD</label>
                            <input name="dbaNombre" value={form.dbaNombre} onChange={handleChange} />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="btn-primary mono"
                        style={{ marginTop: 16, width: 'auto', padding: '10px 24px' }}
                        disabled={guardando}
                    >
                        {guardando ? 'Guardando...' : 'Guardar organización'}
                    </button>
                </form>
            )}

            {loading ? (
                <p style={{ color: 'var(--muted)' }}>Cargando organizaciones...</p>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                        <tr>
                            <th>Organización</th>
                            <th>Área evaluada</th>
                            <th>DBA</th>
                            <th></th>
                        </tr>
                        </thead>
                        <tbody>
                        {organizaciones.map((o) => (
                            <tr key={o.id}>
                                <td className="cell-strong">{o.nombre}</td>
                                <td>{o.areaEvaluada}</td>
                                <td>{o.dbaNombre || '—'}</td>
                                <td>
                                    <button className="btn-danger mono" onClick={() => handleDelete(o.id)}>
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {organizaciones.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>
                                    No hay organizaciones registradas
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