export let mockControles = [
    {
        id: 1,
        codigo: 'A.5.15',
        nombre: 'Control de acceso',
        dominio: 'Control de Accesos',
        objetivo: 'Garantizar que solo usuarios autorizados accedan a la información',
        descripcion: 'Gestión de accesos lógicos a los motores de bases de datos según el principio de mínimo privilegio.',
        peso: 5,
        afectaC: true,
        afectaI: true,
        afectaD: false,
        preguntas: [
            { id: 101, texto: '¿Existen roles y permisos diferenciados en la base de datos?' },
            { id: 102, texto: '¿Se revisan periódicamente los accesos otorgados?' },
            { id: 103, texto: '¿Las cuentas de administrador están restringidas y auditadas?' },
        ],
    },
    {
        id: 2,
        codigo: 'A.8.13',
        nombre: 'Respaldo de la información',
        dominio: 'Seguridad Operativa',
        objetivo: 'Asegurar la disponibilidad de la información ante fallos o pérdida',
        descripcion: 'Políticas y procedimientos de respaldo periódico y pruebas de restauración.',
        peso: 5,
        afectaC: false,
        afectaI: true,
        afectaD: true,
        preguntas: [
            { id: 201, texto: '¿Existen respaldos automáticos y programados?' },
            { id: 202, texto: '¿Se prueban periódicamente las restauraciones?' },
        ],
    },
    {
        id: 3,
        codigo: 'A.8.24',
        nombre: 'Uso de criptografía',
        dominio: 'Seguridad Operativa',
        objetivo: 'Proteger la confidencialidad e integridad de los datos sensibles',
        descripcion: 'Cifrado de datos en reposo y en tránsito dentro del motor de base de datos.',
        peso: 4,
        afectaC: true,
        afectaI: true,
        afectaD: false,
        preguntas: [
            { id: 301, texto: '¿Los datos sensibles están cifrados en reposo?' },
            { id: 302, texto: '¿Las conexiones a la base de datos usan cifrado en tránsito (TLS)?' },
        ],
    },
];

let nextControlId = 4;
let nextPreguntaId = 401;

export function addControl(control) {
    const nuevo = { ...control, id: nextControlId++, preguntas: [] };
    mockControles = [...mockControles, nuevo];
    return nuevo;
}

export function addPregunta(controlId, texto) {
    const nueva = { id: nextPreguntaId++, texto };
    mockControles = mockControles.map((c) =>
        c.id === controlId ? { ...c, preguntas: [...c.preguntas, nueva] } : c
    );
    return nueva;
}

export function deleteControl(id) {
    mockControles = mockControles.filter((c) => c.id !== id);
}