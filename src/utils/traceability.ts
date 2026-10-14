import { Initiative, Phase, PauseRecord } from "../types";
import { parseDateSafe, formatDateSafe, PHASE_SCHEDULE_CONFIGS, getPhaseDateRanges } from "../data";

export interface PhaseTraceDetail {
  phaseNum: number;
  name: string;
  shortName: string;
  startDateStr: string;
  endDateStr: string;
  status: "completed" | "current" | "upcoming";
  taskCount: number;
  progress: number;
  colorClass: string;
}

export interface InitiativeTraceability {
  hasDates: boolean;
  hasPhases: boolean;
  startDate: Date | null;
  endDate: Date | null;
  projectedEndDate?: Date | null;
  startDateFormatted: string;
  endDateFormatted: string;
  projectedEndDateFormatted?: string;
  totalDays: number;
  netTotalDays: number;
  elapsedDays: number;
  remainingDays: number;
  timeProgressPercent: number; // 0 - 100
  taskProgressPercent: number; // 0 - 100
  currentWeek: number; // 1 - 9
  healthStatus: "ontrack" | "delayed" | "ahead" | "not_started" | "completed" | "missing_dates" | "paused";
  healthLabel: string;
  healthDescription: string;
  delayPercent: number; // positive % difference when behind, e.g. 35
  isCriticalDelay: boolean;
  currentPhaseIndex: number; // 0 - 4, or -1 if not started, 5 if past
  currentPhaseNum: number; // 1 - 5, or 0 / 6
  currentPhaseName: string;
  currentPhaseShort: string;
  phases: PhaseTraceDetail[];
  isPaused: boolean;
  pauseReason?: string;
  pausedAt?: string;
  pausedBy?: string;
  pausedDays: number;
  totalPausedDays: number;
  pauseHistory: PauseRecord[];
}

/**
 * Returns formatted date as DD/MM/YYYY for UI display
 */
export const formatDisplayDate = (d: Date | null, fallbackStr: string = ""): string => {
  if (!d) return fallbackStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

/**
 * Calculates comprehensive timeline and phase traceability for an initiative
 */
export const getInitiativeTraceability = (
  init: Initiative,
  referenceDate?: Date
): InitiativeTraceability => {
  const today = referenceDate ? new Date(referenceDate) : new Date();
  today.setHours(12, 0, 0, 0);

  const startDate = parseDateSafe(init.startDate);
  const endDate = parseDateSafe(init.endDate);

  // Calculate task progress percentage across all phases
  let totalTasks = 0;
  let totalTaskProgress = 0;
  if (init.phases && init.phases.length > 0) {
    init.phases.forEach((p) => {
      (p.tasks || []).forEach((t) => {
        totalTasks++;
        totalTaskProgress += t.progress || 0;
      });
    });
  }
  const taskProgressPercent = totalTasks === 0 ? 0 : Math.round(totalTaskProgress / totalTasks);

  const isPaused = init.status === "En pausa";
  let pausedDays = 0;
  if (isPaused && init.pausedAt) {
    const pDate = parseDateSafe(init.pausedAt);
    if (pDate) {
      pDate.setHours(12, 0, 0, 0);
      pausedDays = Math.max(0, Math.round((today.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }

  const pauseHistory = init.pauseHistory || [];
  const totalPastPausedDays = pauseHistory.reduce((sum, item) => sum + (item.daysPaused || 0), 0);
  const totalPausedDays = totalPastPausedDays + (isPaused ? pausedDays : 0);

  if (!startDate || !endDate) {
    return {
      hasDates: false,
      hasPhases: (init.phases && init.phases.length > 0) || false,
      startDate: null,
      endDate: null,
      projectedEndDate: null,
      startDateFormatted: init.startDate || "No definida",
      endDateFormatted: init.endDate || "No definida",
      projectedEndDateFormatted: init.endDate || "No definida",
      totalDays: 0,
      netTotalDays: 0,
      elapsedDays: 0,
      remainingDays: 0,
      timeProgressPercent: 0,
      taskProgressPercent,
      currentWeek: 0,
      healthStatus: "missing_dates",
      healthLabel: "Sin fechas",
      healthDescription: "Falta definir la fecha de inicio para calcular el cronograma y las 9 semanas.",
      delayPercent: 0,
      isCriticalDelay: false,
      currentPhaseIndex: -1,
      currentPhaseNum: 0,
      currentPhaseName: "Sin cronograma",
      currentPhaseShort: "Sin cronograma",
      phases: [],
      isPaused,
      pauseReason: init.pauseReason,
      pausedAt: init.pausedAt,
      pausedBy: init.pausedBy,
      pausedDays,
      totalPausedDays,
      pauseHistory,
    };
  }

  // Ensure dates are at noon to avoid DST/timezone issues
  startDate.setHours(12, 0, 0, 0);
  endDate.setHours(12, 0, 0, 0);

  // Projected End Date if currently paused
  let projectedEndDate: Date | null = new Date(endDate.getTime());
  if (isPaused && pausedDays > 0) {
    projectedEndDate.setDate(projectedEndDate.getDate() + pausedDays);
  }
  const effectiveEndDate = (isPaused && projectedEndDate) ? projectedEndDate : endDate;

  // Calendar total days vs Net project days (freezing pause days)
  const totalDays = Math.max(1, Math.round((effectiveEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const netTotalDays = Math.max(1, totalDays - totalPausedDays);

  let elapsedDays = 0;
  let remainingDays = netTotalDays;
  let timeProgressPercent = 0;

  if (today.getTime() < startDate.getTime()) {
    // Project has not started yet
    elapsedDays = 0;
    remainingDays = netTotalDays;
    timeProgressPercent = 0;
  } else if (today.getTime() > effectiveEndDate.getTime()) {
    // Project period has ended
    elapsedDays = netTotalDays;
    remainingDays = 0;
    timeProgressPercent = 100;
  } else {
    // Project is in progress: subtract paused days so pause does NOT consume working time
    const rawElapsed = Math.max(1, Math.round((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    elapsedDays = Math.max(0, Math.min(netTotalDays, rawElapsed - totalPausedDays));
    remainingDays = Math.max(0, netTotalDays - elapsedDays);
    timeProgressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / netTotalDays) * 100)));
  }

  // Current week (1 - 9) based on net elapsed days
  const currentWeek = elapsedDays === 0
    ? 0
    : Math.min(9, Math.max(1, Math.ceil(elapsedDays / 7)));

  // Phase ranges with pause offset accounted for
  const phaseRanges = getPhaseDateRanges(init.startDate, totalPausedDays);

  // Calculate detailed status for each of the 5 phases
  const phases: PhaseTraceDetail[] = PHASE_SCHEDULE_CONFIGS.map((cfg, idx) => {
    const range = phaseRanges[idx] || { start: "", end: "" };
    const pStart = parseDateSafe(range.start);
    const pEnd = parseDateSafe(range.end);
    if (pStart) pStart.setHours(12, 0, 0, 0);
    if (pEnd) pEnd.setHours(12, 0, 0, 0);

    let status: "completed" | "current" | "upcoming" = "upcoming";
    if (pStart && pEnd) {
      if (today.getTime() > pEnd.getTime()) {
        status = "completed";
      } else if (today.getTime() >= pStart.getTime() && today.getTime() <= pEnd.getTime()) {
        status = "current";
      } else {
        status = "upcoming";
      }
    }

    // Progress of tasks in this phase
    const initiativePhase = init.phases?.[idx];
    const tasks = initiativePhase?.tasks || [];
    let pProgress = 0;
    if (tasks.length > 0) {
      const pSum = tasks.reduce((acc, t) => acc + (t.progress || 0), 0);
      pProgress = Math.round(pSum / tasks.length);
    }

    // Short name e.g. "Fase 1: Levantamiento"
    const shortName = cfg.name.split("(")[0].trim();

    return {
      phaseNum: cfg.phaseNum,
      name: cfg.name,
      shortName,
      startDateStr: range.start ? formatDisplayDate(parseDateSafe(range.start)) : "",
      endDateStr: range.end ? formatDisplayDate(parseDateSafe(range.end)) : "",
      status,
      taskCount: tasks.length,
      progress: pProgress,
      colorClass: cfg.colorClass,
    };
  });

  // Find active phase index
  let currentPhaseIndex = phases.findIndex((p) => p.status === "current");
  if (currentPhaseIndex === -1) {
    if (today.getTime() < startDate.getTime()) {
      currentPhaseIndex = -1; // Not started
    } else {
      currentPhaseIndex = phases.length; // All finished
    }
  }

  let currentPhaseName = "";
  let currentPhaseShort = "";
  let currentPhaseNum = 0;

  if (currentPhaseIndex === -1) {
    const daysUntilStart = Math.round((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    currentPhaseName = `Por iniciar (en ${daysUntilStart} días)`;
    currentPhaseShort = `Inicia en ${daysUntilStart}d`;
    currentPhaseNum = 0;
  } else if (currentPhaseIndex >= phases.length) {
    currentPhaseName = "Plazo de 9 semanas concluido (MVP)";
    currentPhaseShort = "Concluido";
    currentPhaseNum = phases.length + 1;
  } else {
    currentPhaseNum = phases[currentPhaseIndex].phaseNum;
    currentPhaseName = phases[currentPhaseIndex].name;
    currentPhaseShort = phases[currentPhaseIndex].shortName;
  }

  // Health diagnosis: comparing time elapsed vs task progress
  let healthStatus: "ontrack" | "delayed" | "ahead" | "not_started" | "completed" | "paused" = "ontrack";
  let healthLabel = "Al día";
  let healthDescription = "El avance de las tareas coincide adecuadamente con el tiempo transcurrido.";
  let delayPercent = 0;
  let isCriticalDelay = false;

  if (isPaused) {
    healthStatus = "paused";
    healthLabel = "En Pausa";
    healthDescription = init.pauseReason
      ? `Iniciativa pausada: ${init.pauseReason}`
      : "Iniciativa temporalmente pausada con cronograma congelado.";
  } else if (today.getTime() < startDate.getTime()) {
    healthStatus = "not_started";
    healthLabel = "Por iniciar";
    healthDescription = `El proyecto está programado para iniciar el ${formatDisplayDate(startDate)}.`;
  } else if (today.getTime() > effectiveEndDate.getTime()) {
    if (taskProgressPercent >= 90) {
      healthStatus = "completed";
      healthLabel = "Completado";
      healthDescription = "El cronograma de 9 semanas ha culminado con tareas completadas.";
    } else {
      healthStatus = "delayed";
      healthLabel = "Fuera de plazo";
      delayPercent = Math.max(0, 100 - taskProgressPercent);
      isCriticalDelay = true;
      healthDescription = `El plazo estimado de 9 semanas concluyó el ${formatDisplayDate(effectiveEndDate)} y aún existen tareas pendientes (avance real: ${taskProgressPercent}%).`;
    }
  } else {
    const diff = taskProgressPercent - timeProgressPercent;
    if (diff <= -5) {
      healthStatus = "delayed";
      delayPercent = Math.abs(diff);
      isCriticalDelay = delayPercent >= 20 || (taskProgressPercent === 0 && timeProgressPercent >= 20);
      healthLabel = isCriticalDelay ? "Atraso Crítico" : "Atrasado";
      healthDescription = `Tiempo consumido (${timeProgressPercent}%) superior al avance real (${taskProgressPercent}%). Desfase de ${delayPercent}%.`;
    } else if (diff > 10) {
      healthStatus = "ahead";
      healthLabel = "Adelantado";
      healthDescription = `El avance real (${taskProgressPercent}%) supera el tiempo transcurrido (${timeProgressPercent}%).`;
    } else {
      healthStatus = "ontrack";
      healthLabel = "Al ritmo esperado";
      healthDescription = `Avance (${taskProgressPercent}%) alineado con el tiempo transcurrido (${timeProgressPercent}%).`;
    }
  }

  return {
    hasDates: true,
    hasPhases: (init.phases && init.phases.length > 0) || false,
    startDate,
    endDate,
    projectedEndDate,
    startDateFormatted: formatDisplayDate(startDate),
    endDateFormatted: formatDisplayDate(endDate),
    projectedEndDateFormatted: projectedEndDate ? formatDisplayDate(projectedEndDate) : formatDisplayDate(endDate),
    totalDays,
    netTotalDays,
    elapsedDays,
    remainingDays,
    timeProgressPercent,
    taskProgressPercent,
    currentWeek,
    healthStatus,
    healthLabel,
    healthDescription,
    delayPercent,
    isCriticalDelay,
    currentPhaseIndex,
    currentPhaseNum,
    currentPhaseName,
    currentPhaseShort,
    phases,
    isPaused,
    pauseReason: init.pauseReason,
    pausedAt: init.pausedAt,
    pausedBy: init.pausedBy,
    pausedDays,
    totalPausedDays,
    pauseHistory,
  };
};
