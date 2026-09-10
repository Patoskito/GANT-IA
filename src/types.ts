export interface Task {
  id: string;
  name: string;
  assignedTo: string;
  progress: number;
  progressHistory?: { date: string; progress: number }[];
  start: string;
  end: string;
}

export interface Phase {
  id: string;
  name: string;
  colorClass: string;
  tasks: Task[];
}

export interface Initiative {
  id: string;
  name: string;
  responsible?: string;
  responsible2?: string;
  area?: string;
  areaResponsible?: string;
  areaContact?: string;
  driveLink?: string;
  status?: string;
  startDate: string;
  endDate: string;
  phases: Phase[];
  // Legacy fields kept for compatibility
  hhSaved?: string;
  operationalSavings?: string;
  aiConsumptionCost?: string;
  implementationCost?: string;
  businessMetric?: string;
  // New structured financial & operational metrics (ROI calculator)
  volumenMensual?: number;
  tiempoManualTarea?: number;
  costoHoraHombre?: number;
  gastoFijoActual?: number;
  tiempoIaTarea?: number;
  tipoCostoIa?: string; // "Fijo" | "Variable"
  tarifaIa?: number;
  gastoFijoNuevo?: number;
  horasDesarrollo?: number;
  costoHoraIt?: number;
  costoSetup?: number;
}
