import { Phase, Initiative } from "./types";

export const projectData: Phase[] = [
  {
    id: "fase1",
    name: "Fase 1: Inmersión y Levantamiento (Semanas 1-2)",
    colorClass: "bg-blue-100", 
    tasks: [
      {
        id: "1.1",
        name: "1.1 Coordinación logística y Visita a Obra (Estructuras)",
        assignedTo: "Patoskito - Christian - Milagros",
        progress: 50,
        start: "17/8/26",
        end: "24/8/26",
      },
      {
        id: "1.2",
        name: "1.2 Recopilación de planos DWG/DXF de muestra (Columnas cuadradas)",
        assignedTo: "Patoskito",
        progress: 90,
        start: "17/8/26",
        end: "24/8/26",
      },
      {
        id: "1.3",
        name: "1.3 Mapeo de reglas de negocio y fórmulas matemáticas para Presto",
        assignedTo: "Patoskito - Pablo",
        progress: 40,
        start: "25/8/26",
        end: "31/8/26",
      },
      {
        id: "1.4",
        name: "1.4 REUNIÓN DE AVANCES: Sincronización interna sobre reglas de negocio y enfoque del código",
        assignedTo: "Patoskito - Christian - Pablo",
        progress: 50,
        start: "31/8/26",
        end: "31/8/26",
      },
    ],
  },
  {
    id: "fase2",
    name: "Fase 2: Desarrollo del Motor Backend (Semanas 3-5)",
    colorClass: "bg-red-100", 
    tasks: [
      {
        id: "2.1",
        name: "2.1 Configuración de entorno en Google Colab y librerías base (ezdxf, pandas)",
        assignedTo: "Patoskito - Pablo",
        progress: 20,
        start: "1/9/26",
        end: "7/9/26",
      },
      {
        id: "2.2",
        name: "2.2 Desarrollo de lectura CAD: Extracción de textos y \"Explosión\" de bloques anidados (INSERT)",
        assignedTo: "Patoskito - Pablo",
        progress: 20,
        start: "1/9/26",
        end: "14/9/26",
      },
      {
        id: "2.3",
        name: "2.3 Desarrollo de Match Espacial: Cuadrícula Piso por Piso y Filtro Anti-Basura",
        assignedTo: "Patoskito - Pablo",
        progress: 20,
        start: "8/9/26",
        end: "21/9/26",
      },
      {
        id: "2.4",
        name: "2.4 Lógica Pura (Regex): Separación de Acero Longitudinal vs. Transversal (Estribos/Grapas)",
        assignedTo: "Patoskito - Pablo",
        progress: 0,
        start: "15/9/26",
        end: "21/9/26",
      },
      {
        id: "2.5",
        name: "2.5 REUNIÓN DE AVANCES: Revisión técnica del código de extracción y depuración de la matriz",
        assignedTo: "Patoskito - Christian - Pablo",
        progress: 0,
        start: "21/9/26",
        end: "21/9/26",
      },
    ],
  },
  {
    id: "fase3",
    name: "Fase 3: Integración y Generación de Matriz (Semanas 6-7)",
    colorClass: "bg-green-100", 
    tasks: [
      {
        id: "3.1",
        name: "3.1 Desarrollo de exportación a Plantilla Excel con campos en blanco para variables de obra",
        assignedTo: "Patoskito - Pablo",
        progress: 0,
        start: "22/9/26",
        end: "28/9/26",
      },
      {
        id: "3.2",
        name: "3.2 Llenado Manual de la Plantilla de Prueba (Usuario: Ingeniero de Costos)",
        assignedTo: "Patoskito - Pablo",
        progress: 0,
        start: "22/9/26",
        end: "28/9/26",
      },
      {
        id: "3.3",
        name: "3.3 Diseño del Prompt Estructural para cálculo de tonelaje en Presto GPT",
        assignedTo: "Patoskito - Pablo",
        progress: 0,
        start: "22/9/26",
        end: "28/9/26",
      },
      {
        id: "3.4",
        name: "3.4 Pruebas conjuntas de cálculo (Excel Formateado + Prompt en Presto GPT)",
        assignedTo: "Patoskito - Pablo - Christian",
        progress: 0,
        start: "29/9/26",
        end: "5/10/26",
      },
      {
        id: "3.5",
        name: "3.5 REUNIÓN DE AVANCES: Pruebas internas del flujo completo (Excel + Presto GPT) antes del QA",
        assignedTo: "Patoskito - Christian - Pablo",
        progress: 0,
        start: "5/10/26",
        end: "5/10/26",
      },
    ],
  },
  {
    id: "fase4",
    name: "Fase 4: Validación y Entrega del MVP (Semana 8)",
    colorClass: "bg-purple-100", 
    tasks: [
      {
        id: "4.1",
        name: "4.1 Auditoría QA: Revisión de Falsos Positivos en la matriz extraída vs Plano original",
        assignedTo: "Patoskito - Pablo - David",
        progress: 0,
        start: "6/10/26",
        end: "12/10/26",
      },
      {
        id: "4.2",
        name: "4.2 Ajustes finales y calibración de tolerancias geométricas en el código",
        assignedTo: "Patoskito - Pablo",
        progress: 0,
        start: "6/10/26",
        end: "12/10/26",
      },
      {
        id: "4.3",
        name: "4.3 REUNIÓN DE CIERRE: Presentación de la Prueba de Concepto (PoC) a Gerencia",
        assignedTo: "Patoskito - Christian - Pablo - Milagros - Dusan",
        progress: 0,
        start: "6/10/26",
        end: "12/10/26",
      },
    ],
  }
];

export const initialInitiatives: Initiative[] = [
  {
    id: "init-1",
    name: "Automatización Presto GPT",
    responsible: "Patoskito",
    startDate: "17/8/2026",
    endDate: "12/10/2026",
    phases: projectData
  }
];

export const parseDateSafe = (str: string): Date | null => {
  if (!str) return null;
  const trimmed = str.trim();
  if (trimmed.includes("-")) {
    const parts = trimmed.split("-").map(Number);
    if (parts.length === 3 && parts.every(p => !isNaN(p))) {
      return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    }
  } else if (trimmed.includes("/")) {
    const parts = trimmed.split("/").map(Number);
    if (parts.length === 3 && parts.every(p => !isNaN(p))) {
      let [d, m, y] = parts;
      if (y < 100) y += 2000;
      return new Date(y, m - 1, d, 12, 0, 0);
    }
  }
  return null;
};

export const formatDateSafe = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const calculateEndDateFromStart = (startDateStr: string, weeks: number = 9): string => {
  const base = parseDateSafe(startDateStr);
  if (!base) return "";
  const end = new Date(base.getTime());
  // 9 weeks = 63 days (day 0 to day 62)
  const daysToAdd = Math.max(1, weeks * 7 - 1);
  end.setDate(end.getDate() + daysToAdd);
  return formatDateSafe(end);
};

export interface PhaseScheduleConfig {
  phaseNum: number;
  name: string;
  defaultTaskName: string;
  colorClass: string;
  startDayOffset: number;
  endDayOffset: number;
}

export const PHASE_SCHEDULE_CONFIGS: PhaseScheduleConfig[] = [
  {
    phaseNum: 1,
    name: "Fase 1: Levantamiento de información (semana 1)",
    defaultTaskName: "1.1 Levantamiento de requerimientos e información",
    colorClass: "bg-blue-100",
    startDayOffset: 0,
    endDayOffset: 6, // 7 days
  },
  {
    phaseNum: 2,
    name: "Fase 2: Evaluación/Analisis de viabilidad del proyecto(semana 2)",
    defaultTaskName: "2.1 Evaluación y análisis de viabilidad técnica/operativa",
    colorClass: "bg-red-100",
    startDayOffset: 7,
    endDayOffset: 13, // 7 days
  },
  {
    phaseNum: 3,
    name: "Fase 3: Desarrollo de proyecto (semana 3 - 7)",
    defaultTaskName: "3.1 Desarrollo e implementación de la solución",
    colorClass: "bg-green-100",
    startDayOffset: 14,
    endDayOffset: 48, // 35 days (5 weeks)
  },
  {
    phaseNum: 4,
    name: "Fase 4: Proyecto en ambiente QA (semana 8)",
    defaultTaskName: "4.1 Pruebas de calidad y validación en ambiente QA",
    colorClass: "bg-purple-100",
    startDayOffset: 49,
    endDayOffset: 55, // 7 days
  },
  {
    phaseNum: 5,
    name: "Fase 5: Despliegue de proyecto (MVP) (semana 9)",
    defaultTaskName: "5.1 Despliegue en producción y pase a MVP",
    colorClass: "bg-teal-100",
    startDayOffset: 56,
    endDayOffset: 62, // 7 days
  },
];

export const getPhaseDateRanges = (startDateStr: string): { start: string; end: string }[] => {
  const base = parseDateSafe(startDateStr);
  return PHASE_SCHEDULE_CONFIGS.map(cfg => {
    if (!base) return { start: "", end: "" };
    const s = new Date(base.getTime());
    s.setDate(s.getDate() + cfg.startDayOffset);
    const e = new Date(base.getTime());
    e.setDate(e.getDate() + cfg.endDayOffset);
    return {
      start: formatDateSafe(s),
      end: formatDateSafe(e)
    };
  });
};

export const getDefaultPhases = (startDateStr?: string): Phase[] => {
  const ranges = startDateStr ? getPhaseDateRanges(startDateStr) : [];
  const now = Date.now();

  return PHASE_SCHEDULE_CONFIGS.map((cfg, idx) => ({
    id: `phase-${now}-${idx + 1}`,
    name: cfg.name,
    colorClass: cfg.colorClass,
    tasks: [
      {
        id: `task-${now}-${idx + 1}`,
        name: cfg.defaultTaskName,
        assignedTo: "",
        progress: 0,
        start: ranges[idx]?.start || "",
        end: ranges[idx]?.end || "",
      },
    ],
  }));
};

export const distributePhaseDates = (phases?: Phase[], startDateStr?: string): Phase[] => {
  if (!phases || phases.length === 0) {
    return getDefaultPhases(startDateStr);
  }

  if (!startDateStr) {
    return phases;
  }

  const ranges = getPhaseDateRanges(startDateStr);

  // If phases have fewer than 5 or different structure, we align each existing phase or pad with defaults
  return PHASE_SCHEDULE_CONFIGS.map((cfg, idx) => {
    const existingPhase = phases[idx];
    const range = ranges[idx];

    if (!existingPhase) {
      const now = Date.now();
      return {
        id: `phase-${now}-${idx + 1}`,
        name: cfg.name,
        colorClass: cfg.colorClass,
        tasks: [
          {
            id: `task-${now}-${idx + 1}`,
            name: cfg.defaultTaskName,
            assignedTo: "",
            progress: 0,
            start: range.start,
            end: range.end,
          },
        ],
      };
    }

    // Preserve existing phase name if customized, or use standard name if it's generic
    const name = existingPhase.name.startsWith("Fase") ? existingPhase.name : cfg.name;
    const tasks = (existingPhase.tasks && existingPhase.tasks.length > 0)
      ? existingPhase.tasks.map((t) => ({
          ...t,
          // Respect each phase's assigned date range
          start: range.start,
          end: range.end,
        }))
      : [
          {
            id: `task-${Date.now()}-${idx + 1}`,
            name: cfg.defaultTaskName,
            assignedTo: "",
            progress: 0,
            start: range.start,
            end: range.end,
          },
        ];

    return {
      ...existingPhase,
      name,
      colorClass: existingPhase.colorClass || cfg.colorClass,
      tasks,
    };
  });
};

export const getEmptyPhases = (startDateStr?: string): Phase[] => getDefaultPhases(startDateStr);
