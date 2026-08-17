import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Organizaciones from './pages/Organizaciones';
import Controles from './pages/Controles';
import Auditorias from './pages/Auditorias';
import AuditoriaWizard from './pages/AuditoriaWizard';
import Resultados from './pages/Resultados';
import Historico from './pages/Historico';
import Usuarios from './pages/Usuarios';
import DemoInstrumento from './pages/DemoInstrumento';
import './styles/global.css';

export default function App() {
    return (
        <LanguageProvider>
            <ThemeProvider>
                <AuthProvider>
                    <BrowserRouter>
                        <Routes>
                            <Route path="/" element={<Landing />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/demo" element={<DemoInstrumento />} />

                            <Route
                                path="/app"
                                element={
                                    <ProtectedRoute>
                                        <Layout />
                                    </ProtectedRoute>
                                }
                            >
                                <Route index element={<Dashboard />} />
                                <Route path="organizaciones" element={<Organizaciones />} />
                                <Route path="controles" element={<Controles />} />
                                <Route path="auditorias" element={<Auditorias />} />
                                <Route path="auditorias/:id" element={<AuditoriaWizard />} />
                                <Route path="resultados" element={<Resultados />} />
                                <Route path="historico" element={<Historico />} />
                                <Route
                                    path="usuarios"
                                    element={
                                        <ProtectedRoute requiredRole="admin">
                                            <Usuarios />
                                        </ProtectedRoute>
                                    }
                                />
                            </Route>
                        </Routes>
                    </BrowserRouter>
                </AuthProvider>
            </ThemeProvider>
        </LanguageProvider>
    );
}