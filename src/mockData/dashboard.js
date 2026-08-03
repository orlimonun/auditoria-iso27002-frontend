export const mockKPIs = {
    auditoriasActivas: 3,
    promedioMadurez: 2.4, // escala 0-5
    indiceRiesgoGlobal: 62, // 0-100
    organizacionesEvaluadas: 7,
};

// Umbrales para el color semántico del riesgo
export function getRiskLevel(indice) {
    if (indice < 30) return { label: 'Bajo', color: 'var(--risk-low)' };
    if (indice < 60) return { label: 'Medio', color: 'var(--risk-mid)' };
    if (indice < 85) return { label: 'Alto', color: 'var(--risk-high)' };
    return { label: 'Crítico', color: 'var(--risk-critical)' };
}

export const mockAuditoriasRecientes = [
    {
        id: 1,
        organizacion: 'Hospital San Rafael',
        auditor: 'Jostin Campos',
        fecha: '2026-07-18',
        estado: 'en_progreso',
        avance: 68,
    },
    {
        id: 2,
        organizacion: 'Cooperativa Coopeagri',
        auditor: 'Ian Mora',
        fecha: '2026-07-10',
        estado: 'completada',
        avance: 100,
    },
    {
        id: 3,
        organizacion: 'Municipalidad de Heredia',
        auditor: 'Estrella Medrano',
        fecha: '2026-06-29',
        estado: 'completada',
        avance: 100,
    },
    {
        id: 4,
        organizacion: 'Banco Popular - Sucursal Central',
        auditor: 'Imanol Monge',
        fecha: '2026-07-22',
        estado: 'en_progreso',
        avance: 24,
    },
];