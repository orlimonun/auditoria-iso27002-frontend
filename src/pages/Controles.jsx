import { useState, useEffect } from 'react';
import { getControles, crearControl, eliminarControl } from '../api/controles';
import { getDominios, crearDominio } from '../api/dominios';
import ControlPanel from '../components/ControlPanel';

const emptyForm = {
    codigo: '',
    nombre: '',
    dominioId: '',
    objetivo: '',
    descripcion: '',
    peso: 3,
    afectaC: false,
    afectaI: false,
    afectaD: false,
};

export default function Controles() {
    const [controles, setControles] = useState([]);
    const [dominios, setDominios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [selected, setSelected] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [nuevoDominio, setNuevoDominio] = useState('');
    const [creandoDominio, setCreandoDominio] = useState(false);

    const cargarDatos = async () => {
        setLoading(true);
        setError('');
        try {
            const [dataControles, dataDominios] = await Promise.all([
                getControles(),
                getDominios(),
            ]);
            setControles(dataControles);
            setDominios(dataDominios);
        } catch (err) {
            setError('No se pudieron cargar los controles. ¿El backend está corriendo?');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const handleChange = (e) => {
        const { name, type, checked, value } = e.target;
        setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            await crearControl({
                codigo: form.codigo,
                nombre: form.nombre,
                dominio: { id: Number(form.dominioId) },
                objetivo: form.objetivo,
                descripcion: form.descripcion,
                peso: Number(form.peso),
                afectaC: form.afectaC,
                afectaI: form.afectaI,
                afectaD: form.afectaD,
            });
            setForm(emptyForm);
            setShowForm(false);
            await cargarDatos();
        } catch (err) {
            setError('No se pudo guardar el control.');
        } finally {
            setGuardando(false);
        }
    };

    const handleCrearDominio = async () => {
        const nombre = nuevoDominio.trim();
        if (!nombre) return;
        try {
            const creado = await crearDominio(nombre);
            const nuevos = [...dominios, creado];
            setDominios(nuevos);
            setForm({ ...form, dominioId: creado.id });
            setNuevoDominio('');
            setCreandoDominio(false);
        } catch (err) {
            setError(err.message || 'No se pudo crear el dominio.');
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        try {
            await eliminarControl(id);
            setControles(controles.filter((c) => c.id !== id));
            if (selected?.id === id) setSelected(null);
        } catch (err) {
            setError('No se pudo eliminar el control.');
        }
    };

    return (
        <div>
            <div className="page-head">
                <div>
                    <h1>Controles ISO/IEC 27002</h1>
                    <p style={{ color: 'var(--muted)' }}>
                        Catálogo de controles aplicables a la administración de bases de datos
                    </p>
                </div>
                <button className="btn-primary-sm mono" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancelar' : '+ Nuevo control'}
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
                            <label className="mono">Código</label>
                            <input name="codigo" value={form.codigo} onChange={handleChange} placeholder="A.5.15" required />
                        </div>
                        <div className="form-field">
                            <label className="mono">Nombre</label>
                            <input name="nombre" value={form.nombre} onChange={handleChange} required />
                        </div>
                        <div className="form-field">
                            <label className="mono">Dominio</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <select name="dominioId" value={form.dominioId} onChange={handleChange} required style={{ flex: 1 }}>
                                    <option value="">Seleccione...</option>
                                    {dominios.map((d) => (
                                        <option key={d.id} value={d.id}>{d.nombre}</option>
                                    ))}
                                </select>
                                <button type="button" className="btn-ghost mono" onClick={() => setCreandoDominio(!creandoDominio)}>
                                    {creandoDominio ? '\u2715' : '+ Nuevo'}
                                </button>
                            </div>
                            {creandoDominio && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                    <input
                                        value={nuevoDominio}
                                        onChange={(e) => setNuevoDominio(e.target.value)}
                                        placeholder="Nombre del nuevo dominio"
                                        style={{ flex: 1 }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCrearDominio(); } }}
                                    />
                                    <button type="button" className="btn-primary-sm mono" onClick={handleCrearDominio}>
                                        Crear
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="form-field">
                            <label className="mono">Peso (1-10)</label>
                            <input type="number" name="peso" min="1" max="10" value={form.peso} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="form-field" style={{ marginTop: 16 }}>
                        <label className="mono">Objetivo</label>
                        <input name="objetivo" value={form.objetivo} onChange={handleChange} required />
                    </div>
                    <div className="form-field" style={{ marginTop: 16 }}>
                        <label className="mono">Descripción</label>
                        <input name="descripcion" value={form.descripcion} onChange={handleChange} required />
                    </div>

                    <div className="cid-checks mono">
                        <label><input type="checkbox" name="afectaC" checked={form.afectaC} onChange={handleChange} /> Confidencialidad</label>
                        <label><input type="checkbox" name="afectaI" checked={form.afectaI} onChange={handleChange} /> Integridad</label>
                        <label><input type="checkbox" name="afectaD" checked={form.afectaD} onChange={handleChange} /> Disponibilidad</label>
                    </div>

                    <button type="submit" className="btn-primary mono" style={{ marginTop: 16, width: 'auto', padding: '10px 24px' }} disabled={guardando}>
                        {guardando ? 'Guardando...' : 'Guardar control'}
                    </button>
                </form>
            )}

            {loading ? (
                <p style={{ color: 'var(--muted)' }}>Cargando controles...</p>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                        <tr>
                            <th>Código</th>
                            <th>Nombre</th>
                            <th>Dominio</th>
                            <th>Peso</th>
                            <th>C/I/D</th>
                            <th></th>
                        </tr>
                        </thead>
                        <tbody>
                        {controles.map((c) => (
                            <tr key={c.id} className="row-clickable" onClick={() => setSelected(c)}>
                                <td className="mono cell-strong">{c.codigo}</td>
                                <td>{c.nombre}</td>
                                <td>{c.dominio?.nombre}</td>
                                <td className="mono">{c.peso}</td>
                                <td>
                                    <div className="cid-tags">
                                        {c.afectaC && <span className="cid-dot c" title="Confidencialidad" />}
                                        {c.afectaI && <span className="cid-dot i" title="Integridad" />}
                                        {c.afectaD && <span className="cid-dot d" title="Disponibilidad" />}
                                    </div>
                                </td>
                                <td>
                                    <button className="btn-danger mono" onClick={(e) => handleDelete(c.id, e)}>
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ControlPanel control={selected} onClose={() => setSelected(null)} />
        </div>
    );
}