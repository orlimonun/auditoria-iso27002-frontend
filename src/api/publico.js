import { api } from './client';

// Trae el catálogo real de controles/preguntas desde el backend, sin
// requerir autenticación. Usado únicamente por la ventana de demo.
export function getInstrumentoPublico() {
    return api.get('/public/instrumento');
}