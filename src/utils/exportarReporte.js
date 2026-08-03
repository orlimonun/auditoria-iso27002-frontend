import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportarReporteEjecutivo(auditoria, resultados, riesgoGeneral) {
    const doc = new jsPDF();
    const fechaGeneracion = new Date().toLocaleDateString('es-CR');

    // Encabezado
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte Ejecutivo de Auditoría', 14, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Evaluación de riesgo ISO/IEC 27002 — Administración de Bases de Datos', 14, 25);

    doc.setDrawColor(200);
    doc.line(14, 29, 196, 29);

    // Datos generales de la auditoría
    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Datos generales', 14, 38);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const datosGenerales = [
        ['Organización', auditoria.organizacion],
        ['Auditor', auditoria.auditor],
        ['Fecha de inicio', auditoria.fechaInicio],
        ['Fecha de generación del reporte', fechaGeneracion],
    ];
    autoTable(doc, {
        startY: 42,
        body: datosGenerales,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 1.5 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    });

    // KPIs generales
    let y = doc.lastAutoTable.finalY + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Indicadores generales', 14, y);

    autoTable(doc, {
        startY: y + 4,
        head: [['Indicador', 'Valor']],
        body: [
            ['Madurez promedio', `${resultados.madurezPromedioGeneral.toFixed(1)} / 5`],
            ['Índice general de riesgo', `${resultados.indiceGeneral}% (${riesgoGeneral.label})`],
            ['Riesgo — Confidencialidad', `${resultados.riesgoC}%`],
            ['Riesgo — Integridad', `${resultados.riesgoI}%`],
            ['Riesgo — Disponibilidad', `${resultados.riesgoD}%`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [18, 8, 31] },
        styles: { fontSize: 10 },
    });

    // Cumplimiento por dominio
    y = doc.lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Cumplimiento por dominio', 14, y);

    autoTable(doc, {
        startY: y + 4,
        head: [['Dominio', 'Cumplimiento', 'Madurez promedio']],
        body: resultados.cumplimientoPorDominio.map((d) => [
            d.dominio,
            d.cumplimiento !== null ? `${d.cumplimiento}%` : 'Sin datos',
            d.madurezPromedio !== null ? `${d.madurezPromedio} / 5` : 'Sin datos',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [18, 8, 31] },
        styles: { fontSize: 10 },
    });

    // Controles con menor madurez
    y = doc.lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Controles con menor nivel de madurez', 14, y);

    autoTable(doc, {
        startY: y + 4,
        head: [['Código', 'Control', 'Madurez']],
        body: resultados.menorMadurez.length
            ? resultados.menorMadurez.map((c) => [c.codigo, c.nombre, `${c.madurez} / 5`])
            : [['—', 'Sin datos suficientes', '—']],
        theme: 'striped',
        headStyles: { fillColor: [18, 8, 31] },
        styles: { fontSize: 10 },
    });

    // Controles con mayor exposición al riesgo
    y = doc.lastAutoTable.finalY + 10;

    // Salto de página si no hay espacio suficiente
    if (y > 250) {
        doc.addPage();
        y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Controles con mayor exposición al riesgo', 14, y);

    autoTable(doc, {
        startY: y + 4,
        head: [['Código', 'Control', '% Riesgo']],
        body: resultados.mayorRiesgo.length
            ? resultados.mayorRiesgo.map((c) => [c.codigo, c.nombre, `${Math.round(c.pctNo)}%`])
            : [['—', 'Sin datos suficientes', '—']],
        theme: 'striped',
        headStyles: { fillColor: [18, 8, 31] },
        styles: { fontSize: 10 },
    });

    // Pie de página con numeración
    const totalPaginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Página ${i} de ${totalPaginas} — Generado automáticamente por el sistema de auditoría`,
            14,
            290
        );
    }

    const nombreArchivo = `reporte-ejecutivo-${auditoria.organizacion.replace(/\s+/g, '-').toLowerCase()}.pdf`;
    doc.save(nombreArchivo);
}