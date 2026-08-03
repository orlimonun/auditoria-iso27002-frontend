import { api } from './client';

export function getResultados(auditoriaId) {
    return api.get(`/resultados/auditoria/${auditoriaId}`);
}