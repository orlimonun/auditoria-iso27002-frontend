export let mockOrganizaciones = [
    {
        id: 1,
        nombre: 'Hospital San Rafael',
        areaEvaluada: 'Departamento de TI',
        auditor: 'Jostin Campos',
        dba: 'Marco Vindas',
        fechaAuditoria: '2026-07-18',
    },
    {
        id: 2,
        nombre: 'Cooperativa Coopeagri',
        areaEvaluada: 'Sistemas y Bases de Datos',
        auditor: 'Ian Mora',
        dba: 'Laura Chinchilla',
        fechaAuditoria: '2026-07-10',
    },
    {
        id: 3,
        nombre: 'Municipalidad de Heredia',
        areaEvaluada: 'Plataforma Digital',
        auditor: 'Estrella Medrano',
        dba: 'Rodolfo Salas',
        fechaAuditoria: '2026-06-29',
    },
];

let nextId = 4;

export function addOrganizacion(org) {
    const nueva = { ...org, id: nextId++ };
    mockOrganizaciones = [...mockOrganizaciones, nueva];
    return nueva;
}

export function deleteOrganizacion(id) {
    mockOrganizaciones = mockOrganizaciones.filter((o) => o.id !== id);
}