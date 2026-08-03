import { mockControles } from './controles';
import { getRespuestas, getMadurez } from './respuestasAuditoria';

// % de respuestas "No" de un control (excluye N/A)
function porcentajeNoControl(control, respuestas) {
    const respondidas = control.preguntas
        .map((p) => respuestas[p.id])
        .filter((r) => r && r.valor && r.valor !== 'na');

    if (respondidas.length === 0) return null; // sin datos aún

    const noCount = respondidas.filter((r) => r.valor === 'no').length;
    return (noCount / respondidas.length) * 100;
}

// % de cumplimiento de un control ("Sí" sobre respondidas, excluye N/A)
function porcentajeCumplimientoControl(control, respuestas) {
    const respondidas = control.preguntas
        .map((p) => respuestas[p.id])
        .filter((r) => r && r.valor && r.valor !== 'na');

    if (respondidas.length === 0) return null;

    const siCount = respondidas.filter((r) => r.valor === 'si').length;
    return (siCount / respondidas.length) * 100;
}

export function calcularResultados(auditoriaId) {
    const respuestas = getRespuestas(auditoriaId);
    const madurez = getMadurez(auditoriaId);

    const controlesConDatos = mockControles.map((c) => ({
        ...c,
        pctNo: porcentajeNoControl(c, respuestas),
        pctCumplimiento: porcentajeCumplimientoControl(c, respuestas),
        madurez: madurez[c.id] ?? null,
    }));

    // Riesgo ponderado por dimensión (C/I/D)
    const riesgoDimension = (dimKey) => {
        const relevantes = controlesConDatos.filter((c) => c[dimKey] && c.pctNo !== null);
        if (relevantes.length === 0) return 0;
        const sumaPesos = relevantes.reduce((acc, c) => acc + c.peso, 0);
        const sumaPonderada = relevantes.reduce((acc, c) => acc + c.pctNo * c.peso, 0);
        return sumaPesos === 0 ? 0 : Math.round(sumaPonderada / sumaPesos);
    };

    const riesgoC = riesgoDimension('afectaC');
    const riesgoI = riesgoDimension('afectaI');
    const riesgoD = riesgoDimension('afectaD');

    // Índice general de riesgo: promedio ponderado de todos los controles con datos
    const conDatos = controlesConDatos.filter((c) => c.pctNo !== null);
    const sumaPesos = conDatos.reduce((acc, c) => acc + c.peso, 0);
    const sumaPonderada = conDatos.reduce((acc, c) => acc + c.pctNo * c.peso, 0);
    const indiceGeneral = sumaPesos === 0 ? 0 : Math.round(sumaPonderada / sumaPesos);

    // Cumplimiento por dominio
    const dominiosMap = {};
    controlesConDatos.forEach((c) => {
        if (!dominiosMap[c.dominio]) dominiosMap[c.dominio] = [];
        dominiosMap[c.dominio].push(c);
    });

    const cumplimientoPorDominio = Object.entries(dominiosMap).map(([dominio, controles]) => {
        const conDatosDominio = controles.filter((c) => c.pctCumplimiento !== null);
        const promedio =
            conDatosDominio.length === 0
                ? null
                : Math.round(
                    conDatosDominio.reduce((acc, c) => acc + c.pctCumplimiento, 0) / conDatosDominio.length
                );
        const madurezProm =
            conDatosDominio.filter((c) => c.madurez !== null).length === 0
                ? null
                : (
                    conDatosDominio.reduce((acc, c) => acc + (c.madurez ?? 0), 0) /
                    conDatosDominio.filter((c) => c.madurez !== null).length
                ).toFixed(1);
        return { dominio, controles, cumplimiento: promedio, madurezPromedio: madurezProm };
    });

    // Promedio de madurez general
    const conMadurez = controlesConDatos.filter((c) => c.madurez !== null);
    const madurezPromedioGeneral =
        conMadurez.length === 0
            ? 0
            : conMadurez.reduce((acc, c) => acc + c.madurez, 0) / conMadurez.length;

    // Rankings
    const menorMadurez = [...conMadurez].sort((a, b) => a.madurez - b.madurez).slice(0, 5);
    const mayorRiesgo = [...conDatos].sort((a, b) => b.pctNo - a.pctNo).slice(0, 5);

    return {
        controlesConDatos,
        riesgoC,
        riesgoI,
        riesgoD,
        indiceGeneral,
        cumplimientoPorDominio,
        madurezPromedioGeneral,
        menorMadurez,
        mayorRiesgo,
    };
}

export function getRiskLevel(indice) {
    if (indice < 30) return { label: 'Bajo', color: 'var(--risk-low)' };
    if (indice < 60) return { label: 'Medio', color: 'var(--risk-mid)' };
    if (indice < 85) return { label: 'Alto', color: 'var(--risk-high)' };
    return { label: 'Crítico', color: 'var(--risk-critical)' };
}