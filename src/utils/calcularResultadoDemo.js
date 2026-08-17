// Cálculo de resultados para el modo DEMO.
// No llama al backend: todo se deriva de las respuestas que el visitante
// va marcando en memoria mientras usa la ventana de demostración.

function statsControl(control, respuestas) {
    const respondidas = control.preguntas
        .map((p) => respuestas[p.id])
        .filter((r) => r && r.valor && r.valor !== 'na');

    if (respondidas.length === 0) {
        return { pctNo: null, cumplimiento: null };
    }
    const noCount = respondidas.filter((r) => r.valor === 'no').length;
    const siCount = respondidas.filter((r) => r.valor === 'si').length;
    return {
        pctNo: (noCount / respondidas.length) * 100,
        cumplimiento: Math.round((siCount / respondidas.length) * 100),
    };
}

function riesgoDimension(controles, dimKey) {
    const relevantes = controles.filter((c) => c[dimKey] && c.pctNo !== null);
    const sumaPesos = relevantes.reduce((acc, c) => acc + c.peso, 0);
    if (sumaPesos === 0) return 0;
    const sumaPonderada = relevantes.reduce((acc, c) => acc + c.pctNo * c.peso, 0);
    return Math.round(sumaPonderada / sumaPesos);
}

export function calcularResultadosDemo(controles, respuestas, madurez) {
    const controlesConDatos = controles.map((c) => {
        const { pctNo, cumplimiento } = statsControl(c, respuestas);
        return {
            ...c,
            pctNo,
            cumplimiento,
            nivelMadurez: madurez[c.id] ?? null,
        };
    });

    const riesgoC = riesgoDimension(controlesConDatos, 'afectaC');
    const riesgoI = riesgoDimension(controlesConDatos, 'afectaI');
    const riesgoD = riesgoDimension(controlesConDatos, 'afectaD');

    const dominiosMap = {};
    controlesConDatos.forEach((c) => {
        if (!dominiosMap[c.dominio]) dominiosMap[c.dominio] = [];
        dominiosMap[c.dominio].push(c);
    });

    const dominios = Object.entries(dominiosMap).map(([dominio, ctrls]) => {
        const conDatos = ctrls.filter((c) => c.cumplimiento !== null);
        const cumplimiento =
            conDatos.length === 0
                ? 0
                : Math.round(conDatos.reduce((acc, c) => acc + c.cumplimiento, 0) / conDatos.length);
        const conMadurez = ctrls.filter((c) => c.nivelMadurez !== null);
        const madurezPromedio =
            conMadurez.length === 0
                ? null
                : (conMadurez.reduce((acc, c) => acc + c.nivelMadurez, 0) / conMadurez.length).toFixed(1);
        return { dominio, cumplimiento, madurezPromedio };
    });

    const conMadurezGeneral = controlesConDatos.filter((c) => c.nivelMadurez !== null);
    const madurezPromedioGeneral =
        conMadurezGeneral.length === 0
            ? 0
            : conMadurezGeneral.reduce((acc, c) => acc + c.nivelMadurez, 0) / conMadurezGeneral.length;

    const conRespuestas = controlesConDatos.filter((c) => c.pctNo !== null);

    const menorMadurez = [...conMadurezGeneral]
        .sort((a, b) => a.nivelMadurez - b.nivelMadurez)
        .slice(0, 5)
        .map((c) => ({ controlId: c.id, codigo: c.codigo, nombre: c.nombre, nivelMadurez: c.nivelMadurez }));

    const mayorRiesgo = [...conRespuestas]
        .sort((a, b) => b.pctNo - a.pctNo)
        .slice(0, 5)
        .map((c) => ({ controlId: c.id, codigo: c.codigo, nombre: c.nombre, riesgoControl: c.pctNo }));

    return {
        dominios,
        riesgoC,
        riesgoI,
        riesgoD,
        madurezPromedioGeneral,
        controles: controlesConDatos.map((c) => ({
            controlId: c.id,
            codigo: c.codigo,
            nombre: c.nombre,
            riesgoControl: c.pctNo ?? 0,
            nivelMadurez: c.nivelMadurez ?? 0,
        })),
        menorMadurez,
        mayorRiesgo,
    };
}