// Estructura: { [auditoriaId]: { [preguntaId]: { valor: 'si'|'no'|'na', observacion: '' }, ... } }
export let respuestasPorAuditoria = {};

// Estructura: { [auditoriaId]: { [controlId]: nivelMadurez (0-5) } }
export let madurezPorAuditoria = {};

export function getRespuestas(auditoriaId) {
    if (!respuestasPorAuditoria[auditoriaId]) respuestasPorAuditoria[auditoriaId] = {};
    return respuestasPorAuditoria[auditoriaId];
}

export function setRespuesta(auditoriaId, preguntaId, data) {
    const actuales = getRespuestas(auditoriaId);
    respuestasPorAuditoria[auditoriaId] = { ...actuales, [preguntaId]: data };
}

export function getMadurez(auditoriaId) {
    if (!madurezPorAuditoria[auditoriaId]) madurezPorAuditoria[auditoriaId] = {};
    return madurezPorAuditoria[auditoriaId];
}

export function setMadurez(auditoriaId, controlId, nivel) {
    const actuales = getMadurez(auditoriaId);
    madurezPorAuditoria[auditoriaId] = { ...actuales, [controlId]: nivel };
}