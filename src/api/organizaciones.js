import { api } from './client';

export function getOrganizaciones() {
    return api.get('/organizaciones');
}

export function crearOrganizacion(datos) {
    return api.post('/organizaciones', datos);
}

export function actualizarOrganizacion(id, datos) {
    return api.put(`/organizaciones/${id}`, datos);
}

export function eliminarOrganizacion(id) {
    return api.delete(`/organizaciones/${id}`);
}