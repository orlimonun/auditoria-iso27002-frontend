import { api } from './client';

// Estado de conexion del backend con Oracle
export function getEstadoOracle() {
    return api.get('/monitoreo/oracle/estado');
}

// Salud de la instancia Autonomous (se conserva por compatibilidad)
export function getSaludOracle() {
    return api.get('/monitoreo/oracle/salud');
}

// Todas las instancias vigiladas, con el arbol de tres niveles ya evaluado
export function getInstanciasOracle() {
    return api.get('/monitoreo/oracle/instancias');
}

// Catalogo completo de variables: consulta, umbrales, fuente y peso.
// Sirve para la pantalla de configuracion y para poder demostrar de donde
// sale cada limite sin depender de que una instancia este reportando.
export function getCatalogoOracle() {
    return api.get('/monitoreo/oracle/catalogo');
}

// Ajuste de umbrales en caliente
export function ajustarUmbral(codigo, umbralAdvertencia, umbralCritico) {
    return api.patch(`/monitoreo/oracle/catalogo/${codigo}`, {
        umbralAdvertencia, umbralCritico,
    });
}