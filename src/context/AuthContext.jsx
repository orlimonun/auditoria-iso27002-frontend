import { createContext, useContext, useState, useEffect } from 'react';
import { login as loginRequest } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Al cargar la app, revisa si ya había una sesión guardada
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (token && userData) {
            setUser(JSON.parse(userData));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const data = await loginRequest(email, password);
        const usuario = {
            nombre: data.nombre,
            email: data.email,
            rol: data.rol,
        };
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(usuario));
        setUser(usuario);
        return usuario;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}