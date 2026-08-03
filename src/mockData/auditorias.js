export let mockAuditorias = [
    {
        id: 1,
        organizacionId: 1,
        organizacion: 'Hospital San Rafael',
        auditor: 'Jostin Campos',
        fechaInicio: '2026-07-18',
        estado: 'en_progreso', // en_progreso | completada
        avance: 68,
    },
    {
        id: 2,
        organizacionId: 2,
        organizacion: 'Cooperativa Coopeagri',
        auditor: 'Ian Mora',
        fechaInicio: '2026-07-05',
        estado: 'completada',
        avance: 100,
    },
    {
        id: 3,
        organizacionId: 3,
        organizacion: 'Municipalidad de Heredia',
        auditor: 'Estrella Medrano',
        fechaInicio: '2026-06-29',
        estado: 'completada',
        avance: 100,
    },
];

let nextId = 4;

export function addAuditoria(auditoria) {
    const nueva = { ...auditoria, id: nextId++, estado: 'en_progreso', avance: 0 };
    mockAuditorias = [...mockAuditorias, nueva];
    return nueva;
}