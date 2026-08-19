export const MONITOR_WEIGHTS = { procesos: 0.30, memoria: 0.35, archivos: 0.35 };

const higherIsWorse = (warningAt, degradedAt, criticalAt, max) => ({ warningAt, degradedAt, criticalAt, max });
const lowerIsWorse = (warningBelow, degradedBelow, criticalBelow, max) => ({ warningBelow, degradedBelow, criticalBelow, max });

export const metricDefinitions = {
    procesos: {
        code: 'IP', label: 'Procesos', shortLabel: 'Procesos',
        source: 'V$PROCESS · V$SESSION · V$RESOURCE_LIMIT · V$SESSION_LONGOPS · V$WAIT_CHAINS',
        description: 'Carga de procesos, sesiones, bloqueos y utilización de límites de Oracle.',
        metrics: [
            { key: 'procesosActuales', label: 'Procesos actuales', unit: '', source: 'V$PROCESS', normalRange: '0–207', warningRange: '208–254', degradedRange: '255–284', criticalRange: '285–300', ...higherIsWorse(208, 255, 285, 300), help: 'Procesos Oracle activos frente a un límite configurado de 300.' },
            { key: 'limiteProcesos', label: 'Límite de procesos', unit: '', source: 'V$RESOURCE_LIMIT', reference: true, max: 400, referenceText: 'Valor configurado', help: 'Máximo de procesos permitido; se utiliza como referencia para calcular el IP.' },
            { key: 'sesionesActuales', label: 'Sesiones actuales', unit: '', source: 'V$SESSION', normalRange: '0–344', warningRange: '345–424', degradedRange: '425–474', criticalRange: '475–500', ...higherIsWorse(345, 425, 475, 500), help: 'Total de sesiones conectadas frente a un límite de diseño de 500.' },
            { key: 'sesionesActivas', label: 'Sesiones activas', unit: '%', source: 'V$SESSION', normalRange: '0–69 %', warningRange: '70–84 %', degradedRange: '85–94 %', criticalRange: '95–100 %', ...higherIsWorse(70, 85, 95, 100), help: 'Porcentaje de sesiones que están ejecutando actividad.' },
            { key: 'sesionesInactivas', label: 'Sesiones inactivas', unit: '%', source: 'V$SESSION', normalRange: '0–69 %', warningRange: '70–84 %', degradedRange: '85–94 %', criticalRange: '95–100 %', ...higherIsWorse(70, 85, 95, 100), help: 'Sesiones conectadas sin actividad; una acumulación sostenida puede agotar el límite.' },
            { key: 'sesionesBloqueadas', label: 'Sesiones bloqueadas', unit: '', source: 'V$WAIT_CHAINS', normalRange: '0', warningRange: '1–2', degradedRange: '3–4', criticalRange: '5 o más', ...higherIsWorse(1, 3, 5, 8), help: 'Sesiones que esperan porque otra transacción mantiene un bloqueo.' },
            { key: 'operacionesProlongadas', label: 'Operaciones prolongadas', unit: '', source: 'V$SESSION_LONGOPS', normalRange: '0–1', warningRange: '2–3', degradedRange: '4–5', criticalRange: '6 o más', ...higherIsWorse(2, 4, 6, 8), help: 'Operaciones que permanecen ejecutándose durante un tiempo considerable.' },
            { key: 'usoRecursos', label: 'Uso de límites de recursos', unit: '%', source: 'V$RESOURCE_LIMIT', normalRange: '0–69 %', warningRange: '70–84 %', degradedRange: '85–94 %', criticalRange: '95–100 %', ...higherIsWorse(70, 85, 95, 100), help: 'Mayor porcentaje de utilización entre los límites operativos configurados.' },
        ],
    },
    memoria: {
        code: 'IM', label: 'Memoria', shortLabel: 'Memoria',
        source: 'V$SGA · V$SGAINFO · V$SGASTAT · V$PGASTAT · V$MEMORY_DYNAMIC_COMPONENTS',
        description: 'Distribución de SGA, uso de PGA y señales reales de presión de memoria.',
        metrics: [
            { key: 'tamanoSga', label: 'Tamaño de SGA', unit: ' GB', source: 'V$SGAINFO', reference: true, max: 16, referenceText: 'Valor configurado', help: 'Tamaño total asignado a la región de memoria compartida de Oracle.' },
            { key: 'sgaLibre', label: 'Memoria libre de SGA', unit: '%', source: 'V$SGASTAT', normalRange: '20–40 %', warningRange: '10–19 %', degradedRange: '5–9 %', criticalRange: 'Menos de 5 %', ...lowerIsWorse(20, 10, 5, 40), help: 'Porcentaje disponible dentro de la SGA; debe analizarse junto con sus componentes.' },
            { key: 'sharedPoolUso', label: 'Uso de Shared Pool', unit: '%', source: 'V$SGASTAT', normalRange: '0–80 %', warningRange: '81–88 %', degradedRange: '89–94 %', criticalRange: '95–100 %', ...higherIsWorse(81, 89, 95, 100), help: 'Memoria utilizada para SQL compartido, planes y estructuras internas.' },
            { key: 'bufferCacheHit', label: 'Aciertos de Buffer Cache', unit: '%', source: 'V$SGASTAT', normalRange: '90–100 %', warningRange: '85–89 %', degradedRange: '80–84 %', criticalRange: 'Menos de 80 %', ...lowerIsWorse(90, 85, 80, 100), help: 'Lecturas atendidas desde memoria sin acceder físicamente al disco.' },
            { key: 'pgaAsignada', label: 'PGA asignada', unit: '%', source: 'V$PGASTAT', normalRange: '0–75 %', warningRange: '76–85 %', degradedRange: '86–94 %', criticalRange: '95–100 %', ...higherIsWorse(76, 86, 95, 100), help: 'Porcentaje asignado respecto al objetivo configurado de PGA.' },
            { key: 'pgaUtilizada', label: 'PGA utilizada', unit: '%', source: 'V$PGASTAT', normalRange: '0–75 %', warningRange: '76–85 %', degradedRange: '86–94 %', criticalRange: '95–100 %', ...higherIsWorse(76, 86, 95, 100), help: 'Memoria PGA actualmente utilizada por los procesos del servidor.' },
            { key: 'pgaMaxima', label: 'PGA máxima observada', unit: '%', source: 'V$PGASTAT', normalRange: '0–80 %', warningRange: '81–88 %', degradedRange: '89–94 %', criticalRange: '95–100 %', ...higherIsWorse(81, 89, 95, 100), help: 'Pico de asignación de PGA respecto al objetivo definido.' },
            { key: 'overAllocation', label: 'Over-allocation', unit: '', source: 'V$PGASTAT', normalRange: '0', warningRange: '1–2', degradedRange: '3–4', criticalRange: '5 o más', ...higherIsWorse(1, 3, 5, 8), help: 'Veces que Oracle debió asignar PGA por encima del objetivo.' },
            { key: 'pgaCacheHit', label: 'Cache hit de PGA', unit: '%', source: 'V$PGASTAT', normalRange: '90–100 %', warningRange: '85–89 %', degradedRange: '80–84 %', criticalRange: 'Menos de 80 %', ...lowerIsWorse(90, 85, 80, 100), help: 'Eficiencia del administrador automático de PGA.' },
        ],
    },
    archivos: {
        code: 'IA', label: 'Archivos', shortLabel: 'Archivos',
        source: 'V$DATAFILE · V$TEMPFILE · DBA_TEMP_FILES · V$LOG · V$LOGFILE',
        description: 'Disponibilidad, capacidad y estado de datafiles, tempfiles y redo logs.',
        metrics: [
            { key: 'datafilesOnline', label: 'Datafiles online', unit: '', source: 'V$DATAFILE', reference: true, max: 30, referenceText: 'Archivos disponibles', help: 'Cantidad de datafiles disponibles y operativos.' },
            { key: 'datafilesOffline', label: 'Datafiles offline', unit: '', source: 'V$DATAFILE', normalRange: '0', warningRange: '1', degradedRange: '2', criticalRange: '3 o más', ...higherIsWorse(1, 2, 3, 5), help: 'Datafiles fuera de línea; pueden afectar la disponibilidad.' },
            { key: 'capacidadDatafiles', label: 'Capacidad de datafiles', unit: '%', source: 'V$DATAFILE', normalRange: '0–79 %', warningRange: '80–84 %', degradedRange: '85–89 %', criticalRange: '90–100 %', ...higherIsWorse(80, 85, 90, 100), help: 'Ocupación del datafile con menor espacio disponible.' },
            { key: 'tablespaces', label: 'Espacio de tablespaces', unit: '%', source: 'DBA_TABLESPACE_USAGE_METRICS', normalRange: '0–79 %', warningRange: '80–84 %', degradedRange: '85–89 %', criticalRange: '90–100 %', ...higherIsWorse(80, 85, 90, 100), help: 'Porcentaje del tablespace con mayor ocupación.' },
            { key: 'tempfilesProblema', label: 'Tempfiles con problemas', unit: '', source: 'V$TEMPFILE · DBA_TEMP_FILES', normalRange: '0', warningRange: '1', degradedRange: '2', criticalRange: '3 o más', ...higherIsWorse(1, 2, 3, 5), help: 'Tempfiles con estado o capacidad que requiere atención.' },
            { key: 'redoProblema', label: 'Redo logs con problemas', unit: '', source: 'V$LOG · V$LOGFILE', normalRange: '0', warningRange: '1', degradedRange: '2', criticalRange: '3 o más', ...higherIsWorse(1, 2, 3, 5), help: 'Grupos o miembros de redo log con estado anormal.' },
            { key: 'archivosInvalidos', label: 'Archivos inválidos', unit: '', source: 'V$DATAFILE · V$LOGFILE', normalRange: '0', warningRange: '1', degradedRange: '2', criticalRange: '3 o más', ...higherIsWorse(1, 2, 3, 5), help: 'Archivos reportados con estado inválido o inconsistente.' },
            { key: 'archivosInaccesibles', label: 'Archivos inaccesibles', unit: '', source: 'V$DATAFILE · V$TEMPFILE', normalRange: '0', warningRange: '1', degradedRange: '2', criticalRange: '3 o más', ...higherIsWorse(1, 2, 3, 5), help: 'Archivos que Oracle no puede utilizar o abrir correctamente.' },
        ],
    },
};

const histories = [
    [86, 87, 88, 89, 90, 90.3], [84, 83, 82, 82, 81, 80.9], [79, 78, 77, 76, 75, 74.7],
    [67, 64, 62, 59, 57, 55.7], [81, 83, 82, 84, 85, 84.6], [78, 77, 75, 74, 73, 72.6],
];
const historyTimes = ['08:00', '09:00', '10:00', '11:00', '12:00', 'Ahora'];
const createHistory = (index) => historyTimes.map((hora, point) => ({ hora, isbd: histories[index][point] }));

const clientRows = [
    [1, 'Cliente 1', 'ORCL-PROD-01', 'San José', 'Hace 12 s', { procesos: 92, memoria: 88, archivos: 91 }, [126,300,210,42,36,0,1,48, 8,26,68,96,59,54,67,0,95, 18,0,64,61,0,0,0,0]],
    [2, 'Cliente 2', 'ORCL-FIN-02', 'Heredia', 'Hace 18 s', { procesos: 76, memoria: 84, archivos: 82 }, [224,300,361,72,61,2,2,74, 8,18,78,92,67,63,79,0,91, 16,0,74,78,0,0,0,0]],
    [3, 'Cliente 3', 'ORCL-ERP-03', 'Alajuela', 'Hace 9 s', { procesos: 71, memoria: 74, archivos: 78 }, [245,300,398,77,72,3,3,82, 12,12,86,87,79,76,87,2,86, 21,0,81,82,1,0,0,0]],
    [4, 'Cliente 4', 'ORCL-CRM-04', 'Cartago', 'Hace 26 s', { procesos: 48, memoria: 63, archivos: 55 }, [289,300,481,96,88,7,7,97, 8,4,96,76,96,94,99,6,74, 14,3,91,94,3,2,3,1]],
    [5, 'Cliente 5', 'ORCL-RRHH-05', 'Guanacaste', 'Hace 15 s', { procesos: 88, memoria: 81, archivos: 85 }, [153,300,256,51,47,0,1,58, 8,21,79,91,71,68,78,0,90, 17,0,72,76,0,0,0,0]],
    [6, 'Cliente 6', 'ORCL-BI-06', 'Puntarenas', 'Hace 21 s', { procesos: 79, memoria: 72, archivos: 68 }, [238,300,382,76,68,2,3,79, 12,10,88,84,82,79,90,3,82, 19,1,88,87,1,1,0,0]],
];

const valueKeys = [
    'procesosActuales','limiteProcesos','sesionesActuales','sesionesActivas','sesionesInactivas','sesionesBloqueadas','operacionesProlongadas','usoRecursos',
    'tamanoSga','sgaLibre','sharedPoolUso','bufferCacheHit','pgaAsignada','pgaUtilizada','pgaMaxima','overAllocation','pgaCacheHit',
    'datafilesOnline','datafilesOffline','capacidadDatafiles','tablespaces','tempfilesProblema','redoProblema','archivosInvalidos','archivosInaccesibles',
];

export const clientesMonitoreo = clientRows.map(([id, nombre, instancia, ubicacion, ultimaActualizacion, scores, rawValues], index) => ({
    id, nombre, instancia, ubicacion, ultimaActualizacion, scores,
    values: Object.fromEntries(valueKeys.map((key, valueIndex) => [key, rawValues[valueIndex]])),
    history: createHistory(index),
}));

export function getHealthScore(cliente) {
    const score = Object.entries(MONITOR_WEIGHTS).reduce((total, [key, weight]) => total + cliente.scores[key] * weight, 0);
    return Math.round(score * 10) / 10;
}

export function getScoreStatus(score) {
    if (score >= 90) return 'optimal';
    if (score >= 75) return 'healthy';
    if (score >= 60) return 'warning';
    if (score >= 40) return 'degraded';
    return 'critical';
}

export function getMetricStatus(metric, value) {
    if (metric.reference) return 'normal';
    if (metric.criticalBelow !== undefined && value < metric.criticalBelow) return 'critical';
    if (metric.degradedBelow !== undefined && value < metric.degradedBelow) return 'degraded';
    if (metric.warningBelow !== undefined && value < metric.warningBelow) return 'warning';
    if (metric.criticalAt !== undefined && value >= metric.criticalAt) return 'critical';
    if (metric.degradedAt !== undefined && value >= metric.degradedAt) return 'degraded';
    if (metric.warningAt !== undefined && value >= metric.warningAt) return 'warning';
    return 'normal';
}

export function getClientAlerts(cliente) {
    return Object.entries(metricDefinitions).flatMap(([categoryKey, definition]) => definition.metrics
        .filter((metric) => !metric.reference)
        .map((metric) => ({
            categoryKey, component: definition.label, variable: metric.label,
            value: `${cliente.values[metric.key]}${metric.unit}`, threshold: metric.normalRange,
            status: getMetricStatus(metric, cliente.values[metric.key]), description: metric.help,
        }))
        .filter((alert) => alert.status !== 'normal'));
}

export function getClientStatus(cliente) {
    return getClientAlerts(cliente).some((alert) => alert.status === 'critical')
        ? 'critical'
        : getScoreStatus(getHealthScore(cliente));
}