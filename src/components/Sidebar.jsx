import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const links = [
    { to: '/', label: 'Dashboard', icon: '◈' },
    { to: '/organizaciones', label: 'Organizaciones', icon: '⌘' },
    { to: '/controles', label: 'Controles ISO', icon: '☰' },
    { to: '/auditorias', label: 'Auditorías', icon: '✓' },
    { to: '/resultados', label: 'Resultados', icon: '▤' },
    { to: '/historico', label: 'Histórico', icon: '↗' },
];

export default function Sidebar() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    return (
        <aside className="sidebar">
            <div className="sidebar-brand mono">
                <span style={{ color: 'var(--green)' }}>&gt;_</span> ISO27002
            </div>

            <nav className="sidebar-nav">
                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.to === '/'}
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    >
                        <span className="sidebar-icon mono">{link.icon}</span>
                        {link.label}
                    </NavLink>
                ))}

                {user?.rol === 'admin' && (
                    <NavLink
                        to="/usuarios"
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    >
                        <span className="sidebar-icon mono">◎</span>
                        Usuarios
                    </NavLink>
                )}
            </nav>

            <div className="sidebar-footer">
                <button className="theme-toggle mono" onClick={toggleTheme}>
                    {theme === 'dark' ? '☀ Modo claro' : '☾ Modo oscuro'}
                </button>

                <div className="sidebar-user">
                    <span className="mono">{user?.nombre}</span>
                    <span className="sidebar-role mono">{user?.rol}</span>
                </div>
                <button className="sidebar-logout mono" onClick={logout}>
                    Cerrar sesión
                </button>
            </div>
        </aside>
    );
}