import { api } from './client';

export function getRespuestas(auditoriaId) {
    return api.get(`/auditorias/${auditoriaId}/respuestas`);
}

export function guardarRespuesta(auditoriaId, preguntaId, respuesta, nivelMadurez, observacion) {
    return api.put(`/auditorias/${auditoriaId}/respuestas`, { preguntaId, respuesta, nivelMadurez, observacion });
}