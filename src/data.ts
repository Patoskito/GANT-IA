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

export interface DefaultTaskTemplate {
  name: string;
  assignedTo?: string;
}

export interface PhaseScheduleConfig {
  phaseNum: number;
  name: string;
  defaultTasks: (string | DefaultTaskTemplate)[];
  colorClass: string;
  startDayOffset: number;
  endDayOffset: number;
}

export const PHASE_SCHEDULE_CONFIGS: PhaseScheduleConfig[] = [
  {
    phaseNum: 1,
    name: "Fase 1. Sinceramiento, Planificación y Evaluación de Riesgos (Semanas 1 - 2)",
    defaultTasks: [
      {
        name: "1.1. Llevar a cabo la reunión de sinceramiento con el solicitante (Validación de dolores, ROI y mapeo estricto de datos reales) - Entregable: Acta de Inicio de Proyecto versión 1 (Borrador).",
        assignedTo: "",
      },
      {
        name: "1.2. Evaluar y clasificar el proyecto (Reunión entre Procesos, Desarrollador IA y Solicitante para auditar información) - Entregable: Acta de Inicio de Proyecto versión preliminar (V2).",
        assignedTo: "Procesos + Desarrollador IA",
      },
      {
        name: "1.3. Definir tratamiento de información según reglas de Seguridad de Proyectos IA (Evaluación de datos sensibles).",
        assignedTo: "",
      },
      {
        name: "1.4. Elaborar documento de alto riesgo y validar con área Legal y TI - Entregable: Documento de Evaluación de Riesgos / Certificado de Auditoría.",
        assignedTo: "",
      },
      {
        name: "1.5. Diseñar Escudo interno para auditoría con TI (Arquitectura base de seguridad).",
        assignedTo: "",
      },
      {
        name: "1.6. Evaluar y calcular scoring final (Beneficios vs TCO) - Entregable: Sustento financiero del proyecto.",
        assignedTo: "",
      },
    ],
    colorClass: "bg-purple-100",
    startDayOffset: 0,
    endDayOffset: 13, // 14 days (Semanas 1 - 2)
  },
  {
    phaseNum: 2,
    name: "Fase 2. Desarrollo IA y Documentación (Semanas 3 - 7)",
    defaultTasks: [
      {
        name: "2.1. Realizar reunión de Kick Off con el Solicitante para ultimar detalles - Entregable: Acta de inicio de Proyecto versión Final.",
        assignedTo: "",
      },
      {
        name: "2.2. Evaluar arquitectura y UI/UX con Procesos.",
        assignedTo: "Procesos + Desarrollador IA",
      },
      {
        name: "2.3. Realizar Construcción lógica e Integración IA (Desarrollo del Backend, Frontend, BD y modelos).",
        assignedTo: "",
      },
      {
        name: "2.4. Testear el avance del desarrollo del proyecto (Pruebas continuas).",
        assignedTo: "",
      },
      {
        name: "2.5. Consolidar MVP (Unificación de módulos).",
        assignedTo: "",
      },
      {
        name: "2.6. Realizar actualización o relevamiento de documentación del Proyecto.",
        assignedTo: "Procesos + Desarrollador IA",
      },
      {
        name: "2.7. Realizar pruebas funcionales con dueño del proceso y responsable IA (Levantamiento de feedback para mejoras sin variar el alcance).",
        assignedTo: "Procesos + Desarrollador IA",
      },
    ],
    colorClass: "bg-amber-100",
    startDayOffset: 14,
    endDayOffset: 48, // 35 days (Semanas 3 - 7)
  },
  {
    phaseNum: 3,
    name: "Fase 3. Despliegue y Release (Semanas 8 - 9)",
    defaultTasks: [
      {
        name: "3.1. Desplegar Release en QA.",
        assignedTo: "",
      },
      {
        name: "3.2. Ejecutar pruebas previas a salida en Producción (Ajustes finales de seguridad y estabilidad).",
        assignedTo: "",
      },
      {
        name: "3.3. Aprobación y validación final por Desarrollo.",
        assignedTo: "",
      },
      {
        name: "3.4. Generar manuales de usuario.",
        assignedTo: "",
      },
      {
        name: "3.5. Desplegar Release en Producción (Go-Live).",
        assignedTo: "",
      },
      {
        name: "3.6. Generar Acta de Cierre de Proyecto.",
        assignedTo: "",
      },
    ],
    colorClass: "bg-emerald-100",
    startDayOffset: 49,
    endDayOffset: 62, // 14 days (Semanas 8 - 9)
  },
];

export const getPhaseDateRanges = (startDateStr: string, pauseOffsetDays: number = 0): { start: string; end: string }[] => {
  const base = parseDateSafe(startDateStr);
  return PHASE_SCHEDULE_CONFIGS.map((cfg, idx) => {
    if (!base) return { start: "", end: "" };
    const s = new Date(base.getTime());
    // Apply cumulative pause shift to phases after phase 1, or throughout
    const offset = idx > 0 ? pauseOffsetDays : 0;
    s.setDate(s.getDate() + cfg.startDayOffset + offset);
    const e = new Date(base.getTime());
    e.setDate(e.getDate() + cfg.endDayOffset + offset);
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
    tasks: cfg.defaultTasks.map((tItem, tIdx) => {
      const taskName = typeof tItem === "string" ? tItem : tItem.name;
      const assignedTo = typeof tItem === "string" ? "" : (tItem.assignedTo || "");
      return {
        id: `task-${now}-${idx + 1}-${tIdx + 1}`,
        name: taskName,
        assignedTo,
        progress: 0,
        start: ranges[idx]?.start || "",
        end: ranges[idx]?.end || "",
      };
    }),
  }));
};

export const distributePhaseDates = (phases?: Phase[], startDateStr?: string): Phase[] => {
  if (!phases || phases.length === 0) {
    return getDefaultPhases(startDateStr);
  }

  const ranges = startDateStr ? getPhaseDateRanges(startDateStr) : [];

  return PHASE_SCHEDULE_CONFIGS.map((cfg, idx) => {
    const existingPhase = phases[idx];
    const range = ranges[idx] || { start: "", end: "" };

    if (!existingPhase) {
      const now = Date.now();
      return {
        id: `phase-${now}-${idx + 1}`,
        name: cfg.name,
        colorClass: cfg.colorClass,
        tasks: cfg.defaultTasks.map((tItem, tIdx) => {
          const taskName = typeof tItem === "string" ? tItem : tItem.name;
          const assignedTo = typeof tItem === "string" ? "" : (tItem.assignedTo || "");
          return {
            id: `task-${now}-${idx + 1}-${tIdx + 1}`,
            name: taskName,
            assignedTo,
            progress: 0,
            start: range.start,
            end: range.end,
          };
        }),
      };
    }

    // Preserve existing phase name if customized, or use standard name if it's generic
    const name = existingPhase.name.startsWith("Fase") ? existingPhase.name : cfg.name;
    let phaseTasks = existingPhase.tasks || [];

    const tasks = (phaseTasks.length > 0)
      ? phaseTasks.map((t) => ({
          ...t,
          // Respect each phase's assigned date range
          start: range.start || t.start || "",
          end: range.end || t.end || "",
        }))
      : cfg.defaultTasks.map((tItem, tIdx) => {
          const taskName = typeof tItem === "string" ? tItem : tItem.name;
          const assignedTo = typeof tItem === "string" ? "" : (tItem.assignedTo || "");
          return {
            id: `task-${Date.now()}-${idx + 1}-${tIdx + 1}`,
            name: taskName,
            assignedTo,
            progress: 0,
            start: range.start,
            end: range.end,
          };
        });

    return {
      ...existingPhase,
      name,
      colorClass: existingPhase.colorClass || cfg.colorClass,
      tasks,
    };
  });
};

export const getEmptyPhases = (startDateStr?: string): Phase[] => getDefaultPhases(startDateStr);
