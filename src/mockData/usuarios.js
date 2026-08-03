export let mockUsuarios = [
    {
        id: 1,
        nombre: 'Jostin Campos',
        correo: 'admin@auditoria.com',
        rol: 'admin',
    },
    {
        id: 2,
        nombre: 'Ian Mora',
        correo: 'ian.mora@auditoria.com',
        rol: 'auditor',
    },
    {
        id: 3,
        nombre: 'Estrella Medrano',
        correo: 'estrella.medrano@auditoria.com',
        rol: 'auditor',
    },
];

let nextId = 4;

export function addUsuario(usuario) {
    const nuevo = { ...usuario, id: nextId++ };
    mockUsuarios = [...mockUsuarios, nuevo];
    return nuevo;
}

export function deleteUsuario(id) {
    mockUsuarios = mockUsuarios.filter((u) => u.id !== id);
}