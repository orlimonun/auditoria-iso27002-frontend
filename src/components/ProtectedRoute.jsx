import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) return null; // o un spinner, si quieres

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    if (requiredRole && user?.rol !== requiredRole) {
        return <Navigate to="/" replace />;
    }

    return children;
}