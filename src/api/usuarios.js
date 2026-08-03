import { api } from './client';

export function getUsuarios() {
    return api.get('/usuarios');
}

export function eliminarUsuario(id) {
    return api.delete(`/usuarios/${id}`);
}