import { api } from './client';

export function getAuditorias() {
    return api.get('/auditorias');
}

export function getAuditoria(id) {
    return api.get(`/auditorias/${id}`);
}

export function crearAuditoria(organizacionId) {
    return api.post('/auditorias', { organizacionId });
}

export function finalizarAuditoria(id) {
    return api.patch(`/auditorias/${id}/finalizar`);
}