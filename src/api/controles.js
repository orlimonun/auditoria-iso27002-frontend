import { api } from './client';

export function getControles() {
    return api.get('/controles');
}

export function crearControl(datos) {
    return api.post('/controles', datos);
}

export function eliminarControl(id) {
    return api.delete(`/controles/${id}`);
}

export function getPreguntas(controlId) {
    return api.get(`/controles/${controlId}/preguntas`);
}

export function crearPregunta(controlId, texto) {
    return api.post(`/controles/${controlId}/preguntas`, { texto });
}