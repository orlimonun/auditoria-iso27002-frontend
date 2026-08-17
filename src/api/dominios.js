import { api } from './client';

export function getDominios() {
    return api.get('/dominios');
}

export function crearDominio(nombre) {
    return api.post('/dominios', { nombre });
}
