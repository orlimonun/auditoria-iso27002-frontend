import { api } from './client';

export function getDominios() {
    return api.get('/dominios');
}