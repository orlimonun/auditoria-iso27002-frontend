import { useState, useEffect } from 'react';
import { getUsuarios, eliminarUsuario } from '../api/usuarios';
import { register } from '../api/auth';
import { useAuth } from '../context/AuthContext';

const emptyForm = { nombre: '', email: '', password: '', rol: 'AUDITOR' };

export default function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [guardando, setGuardando] = useState(false);
    const { user: usuarioActual } = useAuth();

    const cargarUsuarios = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getUsuarios();
            setUsuarios(data);
        } catch (err) {
            setError('No se pudieron cargar los usuarios.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarUsuarios();
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setGuardando(true);
        setError('');
        try {
            await register(form.nombre, form.email, form.password);
            setForm(emptyForm);
            setShowForm(false);
            await cargarUsuarios();
        } catch (err) {
            setError('No se pudo crear el usuario. ¿El correo ya existe?');
        } finally {
            setGuardando(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await eliminarUsuario(id);
            setUsuarios(usuarios.filter((u) => u.id !== id));
        } catch (err) {
            setError('No se pudo eliminar el usuario.');
        }
    };

    return (
        <div>
            <div className="page-head">
                <div>
                    <h1>Usuarios del sistema</h1>
                    <p style={{ color: 'var(--muted)' }}>
                        Administradores y auditores con acceso a la plataforma
                    </p>
                </div>
                <button className="btn-primary-sm mono" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancelar' : '+ Nuevo usuario'}
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
                            <label className="mono">Nombre</label>
                            <input name="nombre" value={form.nombre} onChange={handleChange} required />
                        </div>
                        <div className="form-field">
                            <label className="mono">Correo</label>
                            <input type="email" name="email" value={form.email} onChange={handleChange} required />
                        </div>
                        <div className="form-field">
                            <label className="mono">Contraseña</label>
                            <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={6} />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="btn-primary mono"
                        style={{ marginTop: 16, width: 'auto', padding: '10px 24px' }}
                        disabled={guardando}
                    >
                        {guardando ? 'Creando...' : 'Guardar usuario'}
                    </button>
                    <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: 10 }}>
                        Los nuevos usuarios se crean con rol Auditor por defecto.
                    </p>
                </form>
            )}

            {loading ? (
                <p style={{ color: 'var(--muted)' }}>Cargando usuarios...</p>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Correo</th>
                            <th>Rol</th>
                            <th></th>
                        </tr>
                        </thead>
                        <tbody>
                        {usuarios.map((u) => (
                            <tr key={u.id}>
                                <td className="cell-strong">{u.nombre}</td>
                                <td className="mono">{u.email}</td>
                                <td>
                    <span
                        className="mono"
                        style={{ color: u.rol === 'ADMIN' ? 'var(--violet)' : 'var(--muted)' }}
                    >
                      {u.rol === 'ADMIN' ? 'Administrador' : 'Auditor'}
                    </span>
                                </td>
                                <td>
                                    {u.email !== usuarioActual?.email && (
                                        <button className="btn-danger mono" onClick={() => handleDelete(u.id)}>
                                            Eliminar
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {usuarios.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>
                                    No hay usuarios registrados
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