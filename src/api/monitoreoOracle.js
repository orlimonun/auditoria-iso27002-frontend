import { api } from './client';

// Estado de conexion a Oracle
export function getEstadoOracle() {
    return api.get('/monitoreo/oracle/estado');
}

// Salud en vivo de la instancia Oracle real
export function getSaludOracle() {
    return api.get('/monitoreo/oracle/salud');
}
