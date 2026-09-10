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

export const getEmptyPhases = (): Phase[] => [
  {
    id: `phase-${Date.now()}`,
    name: "Fase 1: Nueva Fase",
    colorClass: "bg-blue-100",
    tasks: [
      {
        id: `task-${Date.now()}`,
        name: "1.1 Nueva tarea",
        assignedTo: "",
        progress: 0,
        start: "",
        end: ""
      }
    ]
  }
];
