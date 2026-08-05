import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setCargando(true);
        try {
            await login(email, password);
            navigate('/app');
        } catch (err) {
            setError('Correo o contraseña incorrectos');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="login-wrap">
            <form className="login-card" onSubmit={handleSubmit}>
                <h1 className="mono">&gt;_ ISO27002</h1>
                <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
                    Evaluación de riesgo en administración de bases de datos
                </p>

                <label className="mono">Correo</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <label className="mono">Contraseña</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                {error && (
                    <p style={{ color: 'var(--risk-high)', fontSize: '0.82rem', marginTop: 10 }}>
                        {error}
                    </p>
                )}

                <button type="submit" className="btn-primary mono" disabled={cargando}>
                    {cargando ? 'Ingresando...' : '> Iniciar sesión()'}
                </button>
            </form>
        </div>
    );
}