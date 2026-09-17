import { api } from './client';

// Estado de conexion a Oracle
export function getEstadoOracle() {
    return api.get('/monitoreo/oracle/estado');
}

// Salud en vivo de la instancia Autonomous (se conserva por compatibilidad)
export function getSaludOracle() {
    return api.get('/monitoreo/oracle/salud');
}

// Todas las instancias vigiladas: la Autonomous leida en vivo por el backend,
// mas las que reportan agentes instalados en redes privadas.
export function getInstanciasOracle() {
    return api.get('/monitoreo/oracle/instancias');
}