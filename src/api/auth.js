import { api } from './client';

export async function login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    return {
        ...data,
        rol: data.rol.toLowerCase(), // normaliza 'ADMIN'/'AUDITOR' -> 'admin'/'auditor'
    };
}

export async function register(nombre, email, password) {
    const data = await api.post('/auth/register', { nombre, email, password });
    return {
        ...data,
        rol: data.rol.toLowerCase(),
    };
}