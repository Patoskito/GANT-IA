import React, { useRef, useEffect, useState } from 'react';
import { Download, ArrowLeft, Plus, Minus, TrendingUp, X, Link as LinkIcon, ExternalLink, Lock, AlertTriangle, GripVertical, CheckCircle2, History, Clock, Check, PauseCircle, Pause, GanttChart } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Initiative, Task, Phase, PauseRecord } from '../types';
import { getDefaultPhases, distributePhaseDates, calculateEndDateFromStart, getPhaseDateRanges, formatDateSafe } from '../data';

const AutoResizeTextarea = ({ value, onChange, className, minHeight = 40 }: { value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, className?: string, minHeight?: number }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value);
    }
  }, [value, isFocused]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, minHeight)}px`;
    }
  }, [localValue, minHeight]);

  return (
    <textarea
      ref={textareaRef}
      value={localValue}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onChange={(e) => {
        setLocalValue(e.target.value);
        onChange(e);
      }}
      className={className}
      rows={1}
      style={{ minHeight: `${minHeight}px`, resize: 'none', overflow: 'hidden' }}
    />
  );
};

const SyncedInput = ({ value, onChange, ...props }: any) => {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value);
    }
  }, [value, isFocused]);

  return (
    <input
      value={localValue}
      onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
      onChange={(e) => {
        setLocalValue(e.target.value);
        if (onChange) onChange(e);
      }}
      {...props}
    />
  );
};


interface Props {
  initiative: Initiative;
  onUpdate: (init: Initiative) => void;
  onBack: () => void;
  userProfile?: { name: string; email: string; role?: string } | null;
}

const parseDate = (dateStr: string) => {
  if (!dateStr) return null;
  const str = dateStr.trim();
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts.map(Number);
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    }
  } else if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      let [d, m, y] = parts.map(Number);
      if (y < 100) y += 2000;
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    }
  }
  return null;
};

const formatFullDateSpanish = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const d = parseDate(dateStr);
  if (!d) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatReadableDateSpanish = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const d = parseDate(dateStr);
  if (!d) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${monthName} ${year}`;
};

const calculateDaysBetween = (startStr: string, endStr: string): number => {
  const s = parseDate(startStr);
  const e = parseDate(endStr);
  if (!s || !e) return 0;
  const diffTime = e.getTime() - s.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24)) + 1;
  return Math.max(0, diffDays);
};

const calculateTaskPauseOverlap = (
  taskStartStr: string,
  taskEndStr: string,
  pauseHistory?: PauseRecord[],
  isCurrentlyPaused?: boolean,
  currentPausedAt?: string
): number => {
  if (!taskStartStr) return 0;
  const tStart = parseDate(taskStartStr);
  if (!tStart) return 0;
  const tEnd = taskEndStr ? parseDate(taskEndStr) : new Date();
  if (!tEnd) return 0;

  let totalPauseDays = 0;

  if (pauseHistory && pauseHistory.length > 0) {
    pauseHistory.forEach(p => {
      const pStart = parseDate(p.pausedAt);
      const pEnd = p.resumedAt ? parseDate(p.resumedAt) : null;
      if (pStart) {
        const effectiveEnd = pEnd || new Date();
        const overlapStart = tStart > pStart ? tStart : pStart;
        const overlapEnd = tEnd < effectiveEnd ? tEnd : effectiveEnd;
        if (overlapEnd >= overlapStart) {
          const days = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));
          totalPauseDays += Math.max(0, days);
        }
      }
    });
  }

  if (isCurrentlyPaused && currentPausedAt) {
    const curPStart = parseDate(currentPausedAt);
    if (curPStart) {
      const now = new Date();
      const overlapStart = tStart > curPStart ? tStart : curPStart;
      const overlapEnd = tEnd < now ? tEnd : now;
      if (overlapEnd >= overlapStart) {
        const days = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));
        totalPauseDays += Math.max(0, days);
      }
    }
  }

  return totalPauseDays;
};

export default function Spreadsheet({ initiative, onUpdate, onBack, userProfile }: Props) {
  const isAdmin = userProfile?.email === 'kayme@flesan.com.pe' || userProfile?.role === 'Administrador';
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isPauseHistoryModalOpen, setIsPauseHistoryModalOpen] = useState(false);
  const [tempLink, setTempLink] = useState(initiative.driveLink || "");
  const [draggedTask, setDraggedTask] = useState<{ phaseId: string; taskIdx: number } | null>(null);
  const [dragOverTask, setDragOverTask] = useState<{ phaseId: string; taskIdx: number } | null>(null);
  const [draggedPhaseIdx, setDraggedPhaseIdx] = useState<number | null>(null);
  const [dragOverPhaseIdx, setDragOverPhaseIdx] = useState<number | null>(null);

  const isPaused = initiative.status === "En pausa";
  let daysInCurrentPause = 0;
  if (isPaused && initiative.pausedAt) {
    const pDate = parseDate(initiative.pausedAt);
    if (pDate) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      daysInCurrentPause = Math.max(0, Math.round((now.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }

  const pauseHistory = initiative.pauseHistory || [];
  const totalPastPauseDays = pauseHistory.reduce((acc, p) => acc + (p.daysPaused || 0), 0);
  const totalOverallPauseDays = totalPastPauseDays + daysInCurrentPause;

  const data = (initiative.phases && initiative.phases.length > 0)
    ? initiative.phases
    : getDefaultPhases(initiative.startDate);

  useEffect(() => {
    if (!initiative.phases || initiative.phases.length === 0) {
      const defaultPhases = getDefaultPhases(initiative.startDate);
      const calculatedEnd = initiative.startDate && !initiative.endDate 
        ? calculateEndDateFromStart(initiative.startDate, 9) 
        : initiative.endDate;
      onUpdate({
        ...initiative,
        phases: defaultPhases,
        ...(calculatedEnd ? { endDate: calculatedEnd } : {}),
      });
      return;
    }

    const hasAnyTaskDates = initiative.phases.some(p => p.tasks.some(t => Boolean(t.start && t.end)));

    if (initiative.startDate && !hasAnyTaskDates) {
      const distributed = distributePhaseDates(initiative.phases, initiative.startDate);
      const calculatedEnd = initiative.startDate && !initiative.endDate 
        ? calculateEndDateFromStart(initiative.startDate, 9) 
        : initiative.endDate;
      onUpdate({
        ...initiative,
        phases: distributed,
        ...(calculatedEnd ? { endDate: calculatedEnd } : {}),
      });
    }
  }, [initiative.startDate]);

  const isBasicComplete = Boolean(
    initiative.name && 
    initiative.name.trim() !== "" && 
    initiative.name.trim() !== "Nueva Iniciativa" && 
    initiative.area && 
    initiative.area.trim() !== "" && 
    initiative.responsible && 
    initiative.responsible.trim() !== ""
  );

  const handleStartDateChangeInSpreadsheet = (newStartDate: string) => {
    if (!isBasicComplete) {
      return;
    }
    if (!newStartDate) {
      onUpdate({ ...initiative, startDate: "" });
      return;
    }
    const newEndDate = calculateEndDateFromStart(newStartDate, 9);
    const updatedPhases = distributePhaseDates(initiative.phases, newStartDate);
    onUpdate({
      ...initiative,
      startDate: newStartDate,
      endDate: newEndDate,
      phases: updatedPhases,
    });
  };

  // Timeline Calculations (for Project Duration)
  let projectStart = parseDate(initiative.startDate);
  let projectEnd = parseDate(initiative.endDate);

  if (!projectStart || !projectEnd) {
    let minDate: Date | null = null;
    let maxDate: Date | null = null;
    data.forEach(phase => {
      phase.tasks.forEach(task => {
        const ts = parseDate(task.start);
        const te = parseDate(task.end);
        if (ts && (!minDate || ts < minDate)) minDate = ts;
        if (te && (!maxDate || te > maxDate)) maxDate = te;
      });
    });
    
    if (minDate && maxDate) {
      if (!projectStart) projectStart = minDate;
      if (!projectEnd) projectEnd = maxDate;
    } else {
      const now = new Date();
      if (!projectStart) projectStart = new Date(now.getFullYear(), now.getMonth(), 1);
      if (!projectEnd) projectEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
  }

  let durationDays = 0;
  if (projectStart && projectEnd) {
    if (projectStart > projectEnd) {
      const temp = projectStart;
      projectStart = projectEnd;
      projectEnd = temp;
    }
    durationDays = Math.round((projectEnd.getTime() - projectStart.getTime()) / (1000 * 3600 * 24)) + 1;
  }

  // Projected End Date during active pause
  let projectedEndDateStr = initiative.endDate || "";
  if (isPaused && daysInCurrentPause > 0 && initiative.endDate) {
    const origEnd = parseDate(initiative.endDate);
    if (origEnd) {
      const projEnd = new Date(origEnd.getTime());
      projEnd.setDate(projEnd.getDate() + daysInCurrentPause);
      projectedEndDateStr = formatDateSafe(projEnd);
    }
  }

  // Net project work days: subtracting past pauses and freezing during active pause so work days are not inflated
  const netProjectDays = Math.max(1, durationDays - totalPastPauseDays);

  const exportToExcel = () => {
    const wsData = [
      ["TAREA", "ASIGNADO A", "PROGRESO", "INICIO", "FIN / CUMPLIMIENTO", "DÍAS NETOS", "ESTADO"]
    ];

    data.forEach((phase) => {
      wsData.push([phase.name, "", "", "", "", "", ""]);
      phase.tasks.forEach((task) => {
        const status = task.progress === 100 ? "Cumplido" : task.progress > 0 ? "En curso" : "Pendiente";
        const compDate = task.completedAt || task.end || "";
        const calDays = calculateDaysBetween(task.start, compDate);
        const pauseOverlap = calculateTaskPauseOverlap(task.start, compDate, pauseHistory, isPaused, initiative.pausedAt);
        const netDays = Math.max(0, calDays - pauseOverlap);

        wsData.push([
          task.name, 
          task.assignedTo, 
          `${task.progress}%`, 
          task.start || "", 
          compDate,
          netDays > 0 ? String(netDays) : "-",
          status
        ]);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plan de Trabajo");
    XLSX.writeFile(wb, `plan_de_trabajo_${initiative.name.replace(/\s+/g, '_')}.xlsx`);
  };

  const toggleTaskCompletion = (phaseId: string, taskId: string) => {
    const today = new Date().toISOString().split('T')[0];
    onUpdate({
      ...initiative,
      phases: data.map(p => {
        if (p.id !== phaseId) return p;
        return {
          ...p,
          tasks: p.tasks.map(t => {
            if (t.id !== taskId) return t;
            if (t.progress === 100) {
              return {
                ...t,
                progress: 0,
                completedAt: "",
                completedBy: "",
              };
            }
            return {
              ...t,
              progress: 100,
              start: t.start || initiative.startDate || today,
              end: today,
              completedAt: today,
              completedBy: userProfile?.name || "",
            };
          })
        };
      })
    });
  };

  const updatePhaseName = (phaseId: string, newName: string) => {
    onUpdate({
      ...initiative,
      phases: data.map(p => p.id === phaseId ? { ...p, name: newName } : p)
    });
  };

  const addPhase = () => {
    const newPhase: Phase = {
      id: `phase-${Date.now()}`,
      name: "Nueva Fase",
      colorClass: "bg-orange-100", // Default class
      tasks: [{
        id: `task-${Date.now()}`,
        name: "Nueva tarea",
        assignedTo: "",
        progress: 0,
        start: "",
        end: ""
      }]
    };
    onUpdate({ ...initiative, phases: [...data, newPhase] });
  };

  const addTask = (phaseId: string) => {
    const phaseRanges = initiative.startDate ? getPhaseDateRanges(initiative.startDate) : [];
    onUpdate({
      ...initiative,
      phases: data.map((p, pIdx) => {
        if (p.id !== phaseId) return p;
        const defaultDates = (p.tasks[0]?.start && p.tasks[0]?.end)
          ? { start: p.tasks[0].start, end: p.tasks[0].end }
          : (phaseRanges[pIdx] || { start: "", end: "" });

        return {
          ...p,
          tasks: [...p.tasks, {
            id: `task-${Date.now()}`,
            name: `${pIdx + 1}.${p.tasks.length + 1} Nueva tarea`,
            assignedTo: "",
            progress: 0,
            start: defaultDates.start,
            end: defaultDates.end
          }]
        };
      })
    });
  };

  const deletePhase = (phaseId: string) => {
    onUpdate({
      ...initiative,
      phases: data.filter(p => p.id !== phaseId)
    });
  };

  const deleteTask = (phaseId: string, taskId: string) => {
    onUpdate({
      ...initiative,
      phases: data.map(p => {
        if (p.id !== phaseId) return p;
        return {
          ...p,
          tasks: p.tasks.filter(t => t.id !== taskId)
        };
      })
    });
  };

  const moveTaskUp = (phaseId: string, taskIdx: number) => {
    if (taskIdx <= 0) return;
    onUpdate({
      ...initiative,
      phases: data.map(p => {
        if (p.id !== phaseId) return p;
        const newTasks = [...p.tasks];
        const temp = newTasks[taskIdx];
        newTasks[taskIdx] = newTasks[taskIdx - 1];
        newTasks[taskIdx - 1] = temp;
        return { ...p, tasks: newTasks };
      })
    });
  };

  const moveTaskDown = (phaseId: string, taskIdx: number) => {
    onUpdate({
      ...initiative,
      phases: data.map(p => {
        if (p.id !== phaseId) return p;
        if (taskIdx >= p.tasks.length - 1) return p;
        const newTasks = [...p.tasks];
        const temp = newTasks[taskIdx];
        newTasks[taskIdx] = newTasks[taskIdx + 1];
        newTasks[taskIdx + 1] = temp;
        return { ...p, tasks: newTasks };
      })
    });
  };

  const movePhaseUp = (phaseIdx: number) => {
    if (phaseIdx <= 0) return;
    const newPhases = [...data];
    const temp = newPhases[phaseIdx];
    newPhases[phaseIdx] = newPhases[phaseIdx - 1];
    newPhases[phaseIdx - 1] = temp;
    onUpdate({ ...initiative, phases: newPhases });
  };

  const movePhaseDown = (phaseIdx: number) => {
    if (phaseIdx >= data.length - 1) return;
    const newPhases = [...data];
    const temp = newPhases[phaseIdx];
    newPhases[phaseIdx] = newPhases[phaseIdx + 1];
    newPhases[phaseIdx + 1] = temp;
    onUpdate({ ...initiative, phases: newPhases });
  };

  const handleTaskDrop = (targetPhaseId: string, targetTaskIdx: number) => {
    if (!draggedTask) return;
    const { phaseId: sourcePhaseId, taskIdx: sourceTaskIdx } = draggedTask;
    if (sourcePhaseId === targetPhaseId && sourceTaskIdx === targetTaskIdx) {
      setDraggedTask(null);
      setDragOverTask(null);
      return;
    }

    const newPhases = data.map(p => ({ ...p, tasks: [...p.tasks] }));
    const sourcePhase = newPhases.find(p => p.id === sourcePhaseId);
    const targetPhase = newPhases.find(p => p.id === targetPhaseId);

    if (!sourcePhase || !targetPhase) return;

    const [movedTask] = sourcePhase.tasks.splice(sourceTaskIdx, 1);
    if (!movedTask) return;

    targetPhase.tasks.splice(targetTaskIdx, 0, movedTask);

    onUpdate({
      ...initiative,
      phases: newPhases
    });

    setDraggedTask(null);
    setDragOverTask(null);
  };

  const handlePhaseDrop = (targetPhaseIdx: number) => {
    if (draggedPhaseIdx === null || draggedPhaseIdx === targetPhaseIdx) {
      setDraggedPhaseIdx(null);
      setDragOverPhaseIdx(null);
      return;
    }
    const newPhases = [...data];
    const [movedPhase] = newPhases.splice(draggedPhaseIdx, 1);
    newPhases.splice(targetPhaseIdx, 0, movedPhase);
    onUpdate({ ...initiative, phases: newPhases });
    setDraggedPhaseIdx(null);
    setDragOverPhaseIdx(null);
  };

  const updateTaskField = (phaseId: string, taskId: string, field: keyof Task, value: string) => {
    onUpdate({
      ...initiative,
      phases: data.map(p => {
        if (p.id !== phaseId) return p;
        return {
          ...p,
          tasks: p.tasks.map(t => {
            if (t.id !== taskId) return t;
            
            const updatedTask = { ...t };
            if (field === 'progress') {
              let numValue = Number(value);
              if (isNaN(numValue) || numValue < 0) numValue = 0;
              if (numValue > 100) numValue = 100;
              numValue = Math.round(numValue);
              updatedTask.progress = numValue;
              
              const today = new Date().toISOString().split('T')[0];

              if (numValue === 100) {
                if (!updatedTask.completedAt) {
                  updatedTask.completedAt = today;
                }
                if (!updatedTask.end) {
                  updatedTask.end = updatedTask.completedAt || today;
                }
                if (!updatedTask.start) {
                  updatedTask.start = initiative.startDate || today;
                }
                if (userProfile?.name) {
                  updatedTask.completedBy = userProfile.name;
                }
              } else if (numValue > 0 && !updatedTask.start) {
                updatedTask.start = today;
              }

              const history = t.progressHistory ? [...t.progressHistory] : [];
              
              if (history.length === 0 && t.progress > 0) {
                 let fallbackDate = t.start || new Date(Date.now() - 86400000).toISOString().split('T')[0];
                 if (fallbackDate >= today) {
                    const yest = new Date(Date.now() - 86400000);
                    fallbackDate = yest.toISOString().split('T')[0];
                 }
                 history.push({ date: fallbackDate, progress: t.progress });
              }

              const todayIdx = history.findIndex(h => h.date === today);
              
              if (todayIdx >= 0) {
                 history[todayIdx] = { ...history[todayIdx], progress: numValue };
              } else {
                 history.push({ date: today, progress: numValue });
              }
              updatedTask.progressHistory = history.sort((a, b) => a.date.localeCompare(b.date));
            } else if (field === 'completedAt') {
              updatedTask.completedAt = value;
              updatedTask.end = value;
            } else if (field === 'start') {
              let val = value;
              if (initiative.startDate && val && val < initiative.startDate) {
                val = initiative.startDate;
              }
              if (initiative.endDate && val && val > initiative.endDate) {
                val = initiative.endDate;
              }
              updatedTask.start = val;
            } else if (field === 'end') {
              let val = value;
              if (initiative.startDate && val && val < initiative.startDate) {
                val = initiative.startDate;
              }
              if (initiative.endDate && val && val > initiative.endDate) {
                val = initiative.endDate;
              }
              updatedTask.end = val;
            } else {
              (updatedTask as any)[field] = value;
            }
            
            return updatedTask;
          })
        };
      })
    });
  };

  const updateInitiativeField = (field: keyof Initiative, value: any) => {
    onUpdate({
      ...initiative,
      [field]: value
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Bar / Header with Iniciativas IA 2026 style */}
      {initiative.status === "En pausa" && (
        <div className="bg-amber-50 border-b border-amber-300 px-4 py-2 flex items-center justify-between text-xs text-amber-900 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
              ⏸️ Iniciativa en Pausa
            </span>
            <span className="text-amber-900">
              Pausado el <strong>{initiative.pausedAt}</strong> • Motivo: <span className="italic font-medium">"{initiative.pauseReason}"</span>
            </span>
          </div>
          <span className="text-[11px] font-semibold text-amber-800">
            Cronograma temporalmente congelado
          </span>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs shrink-0">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={onBack}
              className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 transition-colors flex items-center justify-center cursor-pointer shadow-2xs shrink-0"
              title="Volver a Iniciativas"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight shrink-0">
                  Plan de Trabajo:
                </h1>
                <span className="text-xs sm:text-sm font-normal text-gray-600 leading-normal break-words max-w-2xl">
                  {initiative.name}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-500 font-medium mt-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-700">R. I:</span>
                  <span className="text-gray-900 font-semibold">{initiative.responsible || 'Sin Asignar'}</span>
                </div>

                <span>•</span>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-700">R. I 2:</span>
                  <SyncedInput 
                    type="text" 
                    value={initiative.responsible2 || ''} 
                    onChange={(e) => updateInitiativeField('responsible2', e.target.value)}
                    className="border border-gray-200 rounded-md px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50 focus:bg-white text-xs"
                    placeholder="Nombre..."
                  />
                </div>

                <span>•</span>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-700">Prioridad:</span>
                  <select
                    value={initiative.priority || 'Alta'}
                    onChange={(e) => updateInitiativeField('priority', e.target.value)}
                    className={`border rounded-md px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-500 text-xs font-bold cursor-pointer ${
                      (initiative.priority || 'Alta') === 'Alta'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : (initiative.priority || 'Alta') === 'Media'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>

                <span>•</span>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-700">Área:</span>
                  <span className="text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md font-semibold border border-gray-200">{initiative.area || 'Sin Asignar'}</span>
                </div>

                <span>•</span>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-700">Resp. Área:</span>
                  <SyncedInput 
                    type="text" 
                    value={initiative.areaResponsible || ''} 
                    onChange={(e) => updateInitiativeField('areaResponsible', e.target.value)}
                    className="border border-gray-200 rounded-md px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50 focus:bg-white text-xs"
                    placeholder="Nombre..."
                  />
                </div>

                <span>•</span>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-700">Contacto:</span>
                  <SyncedInput 
                    type="text" 
                    value={initiative.areaContact || ''} 
                    onChange={(e) => updateInitiativeField('areaContact', e.target.value)}
                    className="border border-gray-200 rounded-md px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50 focus:bg-white text-xs w-36"
                    placeholder="Tel / Email"
                  />
                  <button
                    onClick={() => {
                      setTempLink(initiative.driveLink || '');
                      setIsLinkModalOpen(true);
                    }}
                    className={`p-1 rounded-md border transition-colors ${
                      initiative.driveLink 
                        ? 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100' 
                        : 'text-gray-500 border-gray-200 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    title="Enlace de Drive / Externo"
                  >
                    <LinkIcon size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right side: Mini Timeline & Action buttons */}
          <div className="flex items-center flex-wrap gap-2.5 sm:gap-3 w-full md:w-auto justify-between md:justify-end">
            {/* Mini Línea de Tiempo del Proyecto (Inicio ➔ Fin MVP) */}
            <div className="flex items-center bg-slate-50/95 border border-slate-200/90 rounded-xl px-3.5 py-1.5 shadow-2xs">
              {/* Hito Inicio */}
              <div className="flex flex-col items-start pr-3 border-r border-slate-200">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 select-none">
                  <span className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-blue-100 shrink-0" />
                  <span>Inicio</span>
                  <Lock size={10} className="text-gray-400 shrink-0" title="Fecha de Inicio bloqueada: se define desde el panel principal de iniciativas" />
                </div>
                <span className="text-xs font-bold text-slate-800 mt-0.5 tracking-tight font-mono">
                  {initiative.startDate ? formatFullDateSpanish(initiative.startDate) : "No definida"}
                </span>
              </div>

              {/* Track / Conector de Línea de Tiempo */}
              <div className="flex flex-col items-center px-3 min-w-[140px] sm:min-w-[180px]">
                <div className="flex items-center gap-1.5 mb-1 select-none">
                  <span className="text-[10px] font-extrabold text-blue-900 bg-blue-100/90 px-2 py-0.2 rounded-full">
                    {netProjectDays > 0 ? `${netProjectDays}d netos` : "9 semanas"}
                  </span>
                  {totalOverallPauseDays > 0 && (
                    <button
                      onClick={() => setIsPauseHistoryModalOpen(true)}
                      className="text-[10px] font-extrabold text-amber-950 bg-amber-200/90 hover:bg-amber-300 px-2 py-0.2 rounded-full transition-colors flex items-center gap-1 cursor-pointer shadow-2xs border border-amber-300/80"
                      title="Ver detalle del historial de pausas y días congelados"
                    >
                      <PauseCircle size={10} className="text-amber-800" />
                      <span>+{totalOverallPauseDays}d pausa</span>
                    </button>
                  )}
                </div>

                {/* Barra de Línea de Tiempo con flecha y progreso */}
                <div className="w-full relative flex items-center">
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 rounded-full ${
                        isPaused 
                          ? "bg-amber-500 animate-pulse" 
                          : "bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500"
                      }`}
                      style={{ 
                        width: `${Math.min(100, Math.max(8, Math.round(((durationDays - totalPastPauseDays) / (netProjectDays || 63)) * 100)))}%` 
                      }}
                    />
                  </div>
                  <div className="text-slate-400 text-xs font-black select-none leading-none -ml-1">
                    ➔
                  </div>
                </div>
              </div>

              {/* Hito Fin (MVP) */}
              <div className="flex flex-col items-end pl-3 border-l border-slate-200">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 select-none">
                  <Lock size={10} className={isPaused ? "text-amber-700 shrink-0" : "text-gray-400 shrink-0"} title="Fecha Fin calculada con las 9 semanas y pausas" />
                  <span>Fin (MVP)</span>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isPaused ? "bg-amber-500 ring-2 ring-amber-200 animate-pulse" : "bg-emerald-600 ring-2 ring-emerald-100"}`} />
                </div>
                {isPaused && projectedEndDateStr !== initiative.endDate ? (
                  <div className="flex flex-col items-end mt-0.5">
                    <div className="flex items-center gap-1">
                      <span className="line-through text-amber-800/60 text-[10px] font-mono">{formatFullDateSpanish(initiative.endDate)}</span>
                      <span className="text-amber-700 text-xs font-bold">➔</span>
                      <span className="text-xs font-bold text-amber-950 bg-amber-100/90 px-1 rounded font-mono border border-amber-300/60">
                        {formatFullDateSpanish(projectedEndDateStr)}
                      </span>
                    </div>
                    <span className="text-[9px] text-amber-800 font-extrabold">Proyectada (+{daysInCurrentPause}d)</span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-800 mt-0.5 tracking-tight font-mono">
                    {initiative.endDate ? formatFullDateSpanish(initiative.endDate) : "No definida"}
                  </span>
                )}
              </div>
            </div>

            {/* Botones de Acción (+ Fase y Excel) con estilo Iniciativas IA 2026 */}
            <div className="flex items-center gap-2">
              <button 
                onClick={addPhase}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-2xs flex items-center justify-center cursor-pointer"
                title="Agregar Fase (+)"
                aria-label="Agregar Fase"
              >
                <Plus size={18} className="stroke-[2.5]" />
              </button>
              <button 
                onClick={exportToExcel}
                className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-2xs flex items-center justify-center cursor-pointer"
                title="Exportar a Excel"
                aria-label="Exportar a Excel"
              >
                <Download size={18} className="stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Screen Body matching Iniciativas IA 2026 */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-4 overflow-hidden">
        {/* Banner de Proyecto en Pausa */}
        {isPaused && (
          <div className="p-3.5 bg-amber-50/95 border border-amber-300 rounded-xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs animate-in fade-in shrink-0">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-full bg-amber-200 text-amber-900 shrink-0 mt-0.5">
                <PauseCircle size={18} />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-amber-950 text-sm">PROYECTO EN PAUSA TEMPORAL</span>
                  <span className="bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full text-[11px]">
                    {daysInCurrentPause} {daysInCurrentPause === 1 ? 'día pausado' : 'días pausados'}
                  </span>
                  {initiative.pausedAt && (
                    <span className="text-amber-800 font-medium">
                      (desde el {formatFullDateSpanish(initiative.pausedAt)})
                    </span>
                  )}
                </div>
                {initiative.pauseReason && (
                  <p className="text-amber-900/90 font-medium">
                    <strong className="text-amber-950">Motivo:</strong> {initiative.pauseReason}
                  </p>
                )}
                <p className="text-amber-800 text-[11px]">
                  El cronograma está congelado. Los días de pausa <strong>no consumen plazo de trabajo</strong> ({netProjectDays}d netos preservados). La fecha estimada de finalización se proyecta automáticamente a <strong>{projectedEndDateStr}</strong>.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsPauseHistoryModalOpen(true)}
              className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold rounded-lg border border-amber-300 transition-colors shrink-0 shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <History size={14} /> Historial de Pausas
            </button>
          </div>
        )}

        {/* Full-width Spreadsheet Table Container matching Iniciativas IA 2026 */}
        <div className="bg-white border border-gray-200 shadow-xs rounded-xl overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full min-w-[850px] text-left border-collapse table-auto text-sm">
              <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider font-semibold border-b border-gray-200 sticky top-0 z-30 shadow-xs">
                <tr>
                  <th className="sticky top-0 z-30 bg-gray-50 text-gray-700 font-semibold px-4 py-3 border-b border-gray-200 border-r border-gray-200 select-none text-left">
                    TAREA
                  </th>
                  <th className="sticky top-0 z-30 bg-gray-50 text-gray-700 font-semibold px-3 py-3 text-center w-56 min-w-[170px] border-b border-gray-200 border-r border-gray-200 select-none">
                    ASIGNADO A
                  </th>
                  <th className="sticky top-0 z-30 bg-gray-50 text-gray-700 font-semibold px-2 py-3 text-center w-28 min-w-[85px] border-b border-gray-200 border-r border-gray-200 select-none text-xs">
                    PROGRESO
                  </th>
                  <th className="sticky top-0 z-30 bg-gray-50 text-gray-700 font-semibold px-3 py-3 text-center w-40 min-w-[130px] border-b border-gray-200 border-r border-gray-200 select-none">
                    INICIO REAL
                  </th>
                  <th className="sticky top-0 z-30 bg-gray-50 text-gray-700 font-semibold px-3 py-3 text-center w-64 min-w-[240px] border-b border-gray-200 select-none">
                    CUMPLIMIENTO &amp; TRAZABILIDAD
                  </th>
                </tr>
              </thead>
            <tbody>
              {data.map((phase, phaseIndex) => {
                // Swapped color of Fase 1 with Fase 4: Fase 1 is now bg-[#CCC0DA] (lavender/purple)
                const phaseColors = ["bg-[#CCC0DA]", "bg-[#E6B8B7]", "bg-[#D8E4BC]", "bg-[#B8CCE4]", "bg-[#B7DEE8]"];
                const phaseBgColor = phaseColors[phaseIndex % phaseColors.length];
                const phaseTasks = phase.tasks || [];
                const phaseProgress = phaseTasks.length === 0 ? 0 : Math.round(
                  phaseTasks.reduce((acc, t) => acc + (Number(t.progress) || 0), 0) / phaseTasks.length
                );
                const phaseStart = phaseTasks[0]?.start;
                const phaseEnd = phaseTasks[phaseTasks.length - 1]?.end;
                
                return (
                <React.Fragment key={phase.id}>
                  {/* Phase Row */}
                  <tr 
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', `phase:${phaseIndex}`);
                      setDraggedPhaseIdx(phaseIndex);
                    }}
                    onDragOver={(e) => {
                      if (draggedPhaseIdx !== null) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverPhaseIdx !== phaseIndex) {
                          setDragOverPhaseIdx(phaseIndex);
                        }
                      }
                    }}
                    onDrop={(e) => {
                      if (draggedPhaseIdx !== null) {
                        e.preventDefault();
                        handlePhaseDrop(phaseIndex);
                      }
                    }}
                    onDragEnd={() => {
                      setDraggedPhaseIdx(null);
                      setDragOverPhaseIdx(null);
                    }}
                    className={`border-b border-gray-200 group/phase transition-all ${
                      draggedPhaseIdx === phaseIndex ? "opacity-35 scale-[0.99]" : ""
                    } ${
                      dragOverPhaseIdx === phaseIndex && draggedPhaseIdx !== phaseIndex ? "ring-2 ring-indigo-500 shadow-md" : ""
                    }`}
                  >
                    <td className={`${phaseBgColor} border-b border-t border-gray-200 p-0 font-bold text-gray-800 relative focus-within:ring-2 focus-within:ring-blue-500 focus-within:z-10`} colSpan={5}>
                      <div className="flex items-center justify-between w-full pr-2 py-1">
                        <div className="flex items-center gap-1.5 flex-1 pl-1">
                          {/* Drag handle */}
                          <div 
                            className="cursor-grab active:cursor-grabbing p-1 text-gray-700 hover:text-gray-950 rounded hover:bg-black/10 transition-colors shrink-0"
                            title="Arrastrar para mover fase hacia arriba o abajo"
                          >
                            <GripVertical size={16} />
                          </div>
                          <SyncedInput
                            type="text"
                            value={phase.name}
                            onChange={(e) => updatePhaseName(phase.id, e.target.value)}
                            className="w-full px-2 py-1.5 bg-transparent outline-none font-bold text-gray-900"
                            title="Editar nombre de la Fase"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Avance de Fase basado en % de Progreso (Fechas redundantes eliminadas) */}
                          <div 
                            className="flex items-center gap-2 bg-white/95 px-3 py-1 rounded-full shadow-xs border border-gray-200 mr-1 select-none"
                            title={`Avance de Fase ${phaseIndex + 1}: ${phaseProgress}%`}
                          >
                            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                              Avance:
                            </span>
                            <div className="w-16 sm:w-24 h-2.5 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                              <div 
                                className={`h-full transition-all duration-300 rounded-full ${
                                  phaseProgress === 100 
                                    ? "bg-emerald-500" 
                                    : phaseProgress >= 50 
                                    ? "bg-blue-600" 
                                    : phaseProgress > 0 
                                    ? "bg-amber-500" 
                                    : "bg-gray-300"
                                }`}
                                style={{ width: `${phaseProgress}%` }}
                              />
                            </div>
                            <span className="text-xs font-black text-gray-900 min-w-[3.5ch] text-right">
                              {phaseProgress}%
                            </span>
                            {phaseProgress === 100 && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                                ✓
                              </span>
                            )}
                          </div>
                          {isPaused && phaseProgress < 100 && (
                            <span className="text-[10px] font-extrabold text-amber-950 bg-amber-200/90 border border-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs select-none">
                              <Pause size={10} className="fill-amber-850 text-amber-850" />
                              <span>Fase en Pausa (+{daysInCurrentPause}d)</span>
                            </span>
                          )}
                          <button
                            onClick={() => addTask(phase.id)}
                            className="opacity-0 group-hover/phase:opacity-100 p-1 hover:bg-black/10 rounded transition-all text-gray-700 flex-shrink-0"
                            title="Agregar tarea a esta fase"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            onClick={() => deletePhase(phase.id)}
                            className="opacity-0 group-hover/phase:opacity-100 p-1 hover:bg-red-500/20 text-red-700 rounded transition-all flex-shrink-0"
                            title="Eliminar fase"
                          >
                            <Minus size={16} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Task Rows */}
                  {phaseTasks.map((task, taskIdx) => {
                    const isFirstTask = taskIdx === 0;
                    const isLastTask = taskIdx === phaseTasks.length - 1;
                    const isTaskDragging = draggedTask?.phaseId === phase.id && draggedTask?.taskIdx === taskIdx;
                    const isTaskDragOver = dragOverTask?.phaseId === phase.id && dragOverTask?.taskIdx === taskIdx;

                    return (
                      <tr 
                        key={task.id} 
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', JSON.stringify({ phaseId: phase.id, taskIdx }));
                          setDraggedTask({ phaseId: phase.id, taskIdx });
                        }}
                        onDragOver={(e) => {
                          if (draggedTask) {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            if (dragOverTask?.phaseId !== phase.id || dragOverTask?.taskIdx !== taskIdx) {
                              setDragOverTask({ phaseId: phase.id, taskIdx });
                            }
                          }
                        }}
                        onDrop={(e) => {
                          if (draggedTask) {
                            e.preventDefault();
                            handleTaskDrop(phase.id, taskIdx);
                          }
                        }}
                        onDragEnd={() => {
                          setDraggedTask(null);
                          setDragOverTask(null);
                        }}
                        className={`hover:bg-gray-50/80 transition-colors group/task ${
                          isTaskDragging ? "opacity-30 bg-blue-50/70 scale-[0.99]" : ""
                        } ${
                          isTaskDragOver && !isTaskDragging ? "border-t-4 border-t-blue-600 bg-blue-50/50" : ""
                        }`}
                      >
                        <td className="border-b border-r border-gray-200 p-0 relative focus-within:ring-2 focus-within:ring-blue-500 focus-within:z-10 bg-white group-hover:bg-gray-50/80 transition-colors align-top">
                          <div className="flex items-center gap-1 w-full pr-1">
                            {/* Drag handle */}
                            <div 
                              className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-800 rounded hover:bg-gray-200 transition-colors shrink-0"
                              title="Arrastrar para mover fila hacia arriba o abajo"
                            >
                              <GripVertical size={16} />
                            </div>
                            <AutoResizeTextarea
                              value={task.name}
                              onChange={(e) => updateTaskField(phase.id, task.id, 'name', e.target.value)}
                              className="w-full px-2 py-2 bg-transparent outline-none text-gray-800 text-xs sm:text-sm whitespace-normal break-words"
                            />
                            <button
                              onClick={() => deleteTask(phase.id, task.id)}
                              className="opacity-0 group-hover/task:opacity-100 p-1 hover:bg-red-100 text-red-600 rounded transition-all flex-shrink-0"
                              title="Eliminar tarea"
                            >
                              <Minus size={14} />
                            </button>
                          </div>
                        </td>
                        <td className="border-b border-r border-gray-200 p-0 relative focus-within:ring-2 focus-within:ring-blue-500 focus-within:z-10 bg-white group-hover:bg-gray-50/80 transition-colors align-top">
                          <AutoResizeTextarea
                            value={task.assignedTo}
                            onChange={(e) => updateTaskField(phase.id, task.id, 'assignedTo', e.target.value)}
                            className="w-full px-3 py-2 bg-transparent outline-none text-gray-700 text-center text-xs sm:text-sm whitespace-normal break-words"
                          />
                        </td>
                        <td className="border-b border-r border-gray-200 p-0 text-center relative focus-within:ring-2 focus-within:ring-blue-500 focus-within:z-10 bg-white group-hover:bg-gray-50/80 transition-colors align-middle w-28 min-w-[85px]">
                          <div 
                            className="absolute inset-y-0 left-0 pointer-events-none transition-all duration-300" 
                            style={{ 
                              width: `${Math.min(100, Math.max(0, task.progress))}%`,
                              backgroundColor: task.progress === 100 
                                ? 'rgba(34, 197, 94, 0.25)' 
                                : `rgb(${255 - Math.round(109 * (Math.min(100, Math.max(0, task.progress)) / 100))}, ${255 - Math.round(50 * (Math.min(100, Math.max(0, task.progress)) / 100))}, ${255 - Math.round(35 * (Math.min(100, Math.max(0, task.progress)) / 100))})`
                            }}
                          ></div>
                          <div className="relative flex items-center justify-center gap-0.5 h-full w-full min-h-[44px] px-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={task.progress}
                              onChange={(e) => {
                                let val = e.target.value.replace(/[^0-9]/g, '');
                                if (val === '') {
                                  updateTaskField(phase.id, task.id, 'progress', '0');
                                  return;
                                }
                                let num = parseInt(val, 10);
                                if (isNaN(num) || num < 0) num = 0;
                                if (num > 100) num = 100;
                                updateTaskField(phase.id, task.id, 'progress', num.toString());
                              }}
                              onBlur={(e) => {
                                let val = e.target.value.replace(/[^0-9]/g, '');
                                let num = parseInt(val, 10);
                                if (isNaN(num) || num < 0) num = 0;
                                if (num > 100) num = 100;
                                updateTaskField(phase.id, task.id, 'progress', num.toString());
                              }}
                              className="w-8 h-full py-1.5 bg-transparent outline-none text-right font-black z-10 text-xs sm:text-sm mix-blend-multiply"
                              title="Progreso de la tarea (solo valores de 0 a 100%)"
                            />
                            <span className="font-medium pointer-events-none text-gray-700 mix-blend-multiply text-xs">%</span>
                            <button
                              type="button"
                              onClick={() => toggleTaskCompletion(phase.id, task.id)}
                              className={`p-1 rounded-full transition-all shrink-0 ml-0.5 z-10 cursor-pointer ${
                                task.progress === 100 
                                  ? 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/80' 
                                  : 'text-gray-300 hover:text-emerald-600 hover:bg-gray-200/60'
                              }`}
                              title={task.progress === 100 ? "Marcar como pendiente (0%)" : "Marcar como 100% cumplida hoy"}
                            >
                              <CheckCircle2 size={16} className={task.progress === 100 ? "fill-emerald-100" : ""} />
                            </button>
                          </div>
                        </td>
                        <td className={`border-b border-r border-gray-200 p-0 relative focus-within:ring-2 focus-within:ring-blue-500 focus-within:z-10 transition-colors align-middle w-40 min-w-[130px] ${
                          isFirstTask ? "bg-blue-50/70 font-bold" : "bg-white group-hover:bg-gray-50/80"
                        }`}>
                          <div className="flex flex-col h-full justify-center py-1">
                            {isFirstTask && (
                              <div className="px-2 text-[9px] font-black uppercase tracking-wider text-blue-800 flex items-center justify-center gap-1 select-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                                Inicio Fase {phaseIndex + 1}
                              </div>
                            )}
                            <SyncedInput
                              type="date"
                              value={task.start}
                              min={initiative.startDate || undefined}
                              max={projectedEndDateStr || initiative.endDate || undefined}
                              onChange={(e: any) => updateTaskField(phase.id, task.id, 'start', e.target.value)}
                              className={`w-full py-1 px-2 bg-transparent outline-none text-center text-xs cursor-pointer uppercase ${
                                isFirstTask ? "font-black text-blue-950 underline decoration-blue-500 decoration-1 underline-offset-2" : "font-medium text-gray-700"
                              }`}
                              title={
                                isFirstTask 
                                  ? `Inicio Fase ${phaseIndex + 1} (Hito de Apertura) • Restringido a las 9 semanas (${initiative.startDate || '—'} a ${projectedEndDateStr || initiative.endDate || '—'})`
                                  : `Fecha real de inicio`
                              }
                            />
                            {!task.start && (
                              <div className="text-[10px] text-gray-400 text-center select-none italic">
                                {isPaused ? (
                                  <span className="text-amber-800 font-bold bg-amber-100/90 px-1.5 py-0.2 rounded text-[9px] inline-flex items-center gap-0.5">
                                    <Lock size={9} /> Pausada
                                  </span>
                                ) : (
                                  "Sin iniciar"
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className={`border-b border-r border-gray-200 p-1.5 relative focus-within:ring-2 focus-within:ring-blue-500 focus-within:z-10 transition-colors align-middle w-64 min-w-[240px] ${
                          task.progress === 100 
                            ? "bg-emerald-50/60" 
                            : isLastTask 
                            ? "bg-emerald-50/20" 
                            : isPaused
                            ? "bg-amber-50/30 group-hover:bg-amber-50/50"
                            : "bg-white group-hover:bg-gray-50"
                        }`}>
                          {(() => {
                            const isCompleted = task.progress === 100;
                            const todayStr = new Date().toISOString().split('T')[0];
                            const compDate = task.completedAt || task.end || todayStr;
                            const calendarDays = calculateDaysBetween(task.start, compDate);
                            const pauseOverlap = calculateTaskPauseOverlap(task.start, compDate, pauseHistory, isPaused, initiative.pausedAt);
                            const netDays = Math.max(1, calendarDays - pauseOverlap);

                            if (isCompleted) {
                              return (
                                <div className="flex flex-col gap-1 w-full">
                                  {isLastTask && (
                                    <div className="text-[9px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1 select-none">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                      Hito Cierre Fase {phaseIndex + 1}
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                      <Check size={11} className="stroke-[3]" />
                                      Cumplido
                                    </span>
                                    <SyncedInput
                                      type="date"
                                      value={task.completedAt || task.end || todayStr}
                                      min={task.start || initiative.startDate || undefined}
                                      max={initiative.endDate || undefined}
                                      onChange={(e: any) => updateTaskField(phase.id, task.id, 'completedAt', e.target.value)}
                                      className="text-xs font-bold text-emerald-950 bg-white/90 border border-emerald-300 rounded px-1.5 py-0.5 outline-none cursor-pointer"
                                      title="Fecha real en que se cumplió la actividad"
                                    />
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-gray-500 pt-0.5">
                                    <div className="flex items-center gap-1 font-mono">
                                      <span>{task.start ? formatFullDateSpanish(task.start) : '—'}</span>
                                      <span className="text-emerald-600 font-bold">➔</span>
                                      <span className="font-bold text-emerald-900">{formatFullDateSpanish(compDate)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="bg-emerald-100 text-emerald-900 font-bold px-1.5 py-0.5 rounded" title="Días netos reales de trabajo">
                                        {netDays}d netos
                                      </span>
                                      {pauseOverlap > 0 && (
                                        <span className="bg-amber-100 text-amber-900 font-semibold px-1 py-0.5 rounded" title={`El proyecto estuvo pausado ${pauseOverlap} días durante esta actividad`}>
                                          (+{pauseOverlap}d pausa)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            if (task.progress > 0) {
                              const nowStr = new Date().toISOString().split('T')[0];
                              const elapsedCal = calculateDaysBetween(task.start || nowStr, nowStr);
                              const pauseDuringTask = calculateTaskPauseOverlap(task.start || nowStr, nowStr, pauseHistory, isPaused, initiative.pausedAt);
                              const netElapsed = Math.max(0, elapsedCal - pauseDuringTask);

                              if (isPaused) {
                                return (
                                  <div className="flex flex-col gap-1 w-full bg-amber-50/70 p-1.5 rounded border border-amber-300">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <span>⏸ Congelada</span>
                                        <span>({daysInCurrentPause}d pausa)</span>
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-amber-800 italic">
                                      Proyecto pausado. Retomará al reanudar.
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div className="flex flex-col gap-1 w-full">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-blue-900 bg-blue-100/90 px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <Clock size={11} className="text-blue-600" />
                                      En curso ({netElapsed}d activo)
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                                    <span>{task.start ? `Desde ${formatFullDateSpanish(task.start)}` : 'Iniciada'} ➔ En ejecución</span>
                                    {pauseDuringTask > 0 && (
                                      <span className="text-amber-700 font-semibold">(+{pauseDuringTask}d pausa ant.)</span>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            // Pending task (progress === 0)
                            if (isPaused) {
                              const origEnd = task.end ? parseDate(task.end) : null;
                              let projTaskEnd = task.end;
                              if (origEnd && daysInCurrentPause > 0) {
                                const d = new Date(origEnd.getTime());
                                d.setDate(d.getDate() + daysInCurrentPause);
                                projTaskEnd = formatDateSafe(d);
                              }

                              return (
                                <div className="flex flex-col gap-1 w-full bg-amber-50/70 p-1.5 rounded border border-amber-300">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                      <Pause size={10} className="fill-amber-800 text-amber-800" />
                                      <span>Pendiente (Congelada +{daysInCurrentPause}d)</span>
                                    </span>
                                    {projTaskEnd && (
                                      <span 
                                        className="text-[10px] text-amber-950 font-bold bg-amber-200/90 px-1.5 py-0.5 rounded border border-amber-300/80 select-none shadow-2xs shrink-0" 
                                        title={`Fecha estimada proyectada por pausa (+${daysInCurrentPause}d): ${projTaskEnd}`}
                                      >
                                        Est: {formatFullDateSpanish(projTaskEnd)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-amber-800 font-medium italic">
                                    Cronograma congelado. Se desfasará automáticamente al reanudar.
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div className="flex items-center justify-between w-full py-0.5">
                                <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1 select-none">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                  Pendiente
                                </span>
                                {task.end && (
                                  <span 
                                    className="text-[11px] text-gray-600 font-medium bg-gray-100/90 px-2 py-0.5 rounded border border-gray-200 select-none flex items-center gap-1 shadow-2xs"
                                    title={`Fecha estimada de finalización: ${formatReadableDateSpanish(task.end)} (${formatFullDateSpanish(task.end)})`}
                                  >
                                    <span className="text-gray-400 font-normal">Est:</span>
                                    <span className="font-semibold text-gray-800">{formatFullDateSpanish(task.end)}</span>
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </main>
      {/* Metrics Modal */}
      {isMetricsModalOpen && (() => {
        const volumenMensual = initiative.volumenMensual ?? 0;
        const tiempoManualTarea = initiative.tiempoManualTarea ?? 0;
        const costoHoraHombre = initiative.costoHoraHombre ?? 0;
        const gastoFijoActual = initiative.gastoFijoActual ?? 0;

        const tiempoIaTarea = initiative.tiempoIaTarea ?? 0;
        const tipoCostoIa = initiative.tipoCostoIa ?? 'Fijo';
        const tarifaIa = initiative.tarifaIa ?? 0;
        const gastoFijoNuevo = initiative.gastoFijoNuevo ?? 0;

        const horasDesarrollo = initiative.horasDesarrollo ?? 0;
        const costoHoraIt = initiative.costoHoraIt ?? 0;
        const costoSetup = initiative.costoSetup ?? 0;

        // Fórmulas Matemáticas
        const horasAhorradasMes = (tiempoManualTarea - tiempoIaTarea) * volumenMensual;
        const ahorroBrutoTiempo = horasAhorradasMes * costoHoraHombre;
        const ahorroBrutoFijos = gastoFijoActual - gastoFijoNuevo;
        const costoMensualIa = tipoCostoIa === "Variable" ? tarifaIa * volumenMensual : tarifaIa;
        const costoTotalAsIs = (volumenMensual * tiempoManualTarea * costoHoraHombre) + gastoFijoActual;

        const ahorroNetoMensual = ahorroBrutoTiempo + ahorroBrutoFijos - costoMensualIa;
        const ahorroNetoAnual = ahorroNetoMensual * 12;
        const inversionTotal = (horasDesarrollo * costoHoraIt) + costoSetup;
        const paybackMeses = ahorroNetoMensual > 0 ? `${(inversionTotal / ahorroNetoMensual).toFixed(2)} meses` : 'N/A';

        const handleNumChange = (field: keyof Initiative, val: string) => {
          const num = val === '' ? 0 : parseFloat(val);
          updateInitiativeField(field, isNaN(num) ? 0 : num);
        };

        const handleStringChange = (field: keyof Initiative, val: string) => {
          updateInitiativeField(field, val);
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <TrendingUp size={20} className="text-indigo-600" />
                  Calculador ROI y Análisis Financiero Estimado (AS-IS vs TO-BE)
                </h2>
                <button 
                  onClick={() => setIsMetricsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1.5 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[75vh]">
                {/* Left Column: Form Inputs */}
                <div className="space-y-5">
                  {/* Bloque A */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Bloque A: Situación Actual (El "AS-IS")
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Cantidad de Tareas al Mes</label>
                        <SyncedInput 
                          type="number" 
                          min="0"
                          value={initiative.volumenMensual ?? ''}
                          onChange={(e) => handleNumChange('volumenMensual', e.target.value)}
                          placeholder="Ej. 40"
                          className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Tiempo Actual por Tarea (Horas)</label>
                        <SyncedInput 
                          type="number" 
                          step="0.1"
                          min="0"
                          value={initiative.tiempoManualTarea ?? ''}
                          onChange={(e) => handleNumChange('tiempoManualTarea', e.target.value)}
                          placeholder="Ej. 0.5"
                          className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Costo por Hora de la Persona ($/h)</label>
                        <SyncedInput 
                          type="number" 
                          step="1"
                          min="0"
                          value={initiative.costoHoraHombre ?? ''}
                          onChange={(e) => handleNumChange('costoHoraHombre', e.target.value)}
                          placeholder="Ej. 60"
                          className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Otros Gastos Mensuales Actuales ($)</label>
                        <SyncedInput 
                          type="number" 
                          step="1"
                          min="0"
                          value={initiative.gastoFijoActual ?? ''}
                          onChange={(e) => handleNumChange('gastoFijoActual', e.target.value)}
                          placeholder="Ej. 0"
                          className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bloque B */}
                  <div className="space-y-3 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Bloque B: La Solución Propuesta (El "TO-BE")
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Tiempo por Tarea con la Nueva Solución (Horas)</label>
                        <SyncedInput 
                          type="number" 
                          step="0.01"
                          min="0"
                          value={initiative.tiempoIaTarea ?? ''}
                          onChange={(e) => handleNumChange('tiempoIaTarea', e.target.value)}
                          placeholder="Ej. 0.05"
                          className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Modelo de Cobro de la Solución</label>
                        <select
                          value={initiative.tipoCostoIa ?? 'Fijo'}
                          onChange={(e) => handleStringChange('tipoCostoIa', e.target.value)}
                          className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="Fijo">Fijo Mensual</option>
                          <option value="Variable">Por Uso</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Costo de la Solución ($)</label>
                        <SyncedInput 
                          type="number" 
                          step="0.5"
                          min="0"
                          value={initiative.tarifaIa ?? ''}
                          onChange={(e) => handleNumChange('tarifaIa', e.target.value)}
                          placeholder="Ej. 70.50"
                          className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Otros Gastos Mensuales Nuevos ($)</label>
                        <SyncedInput 
                          type="number" 
                          step="1"
                          min="0"
                          value={initiative.gastoFijoNuevo ?? ''}
                          onChange={(e) => handleNumChange('gastoFijoNuevo', e.target.value)}
                          placeholder="Ej. 0"
                          className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bloque C */}
                  <div className="space-y-3 bg-purple-50/40 p-4 rounded-lg border border-purple-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      Bloque C: Costos de Inversión (Desarrollo)
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Horas para Construir la Solución</label>
                        <SyncedInput 
                          type="number" 
                          min="0"
                          value={initiative.horasDesarrollo ?? ''}
                          onChange={(e) => handleNumChange('horasDesarrollo', e.target.value)}
                          placeholder="Ej. 45"
                          className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Costo por Hora del Desarrollador ($/h)</label>
                        <SyncedInput 
                          type="number" 
                          min="0"
                          value={initiative.costoHoraIt ?? ''}
                          onChange={(e) => handleNumChange('costoHoraIt', e.target.value)}
                          placeholder="Ej. 30"
                          className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Gastos Iniciales de Arranque ($)</label>
                      <SyncedInput 
                        type="number" 
                        min="0"
                        value={initiative.costoSetup ?? ''}
                        onChange={(e) => handleNumChange('costoSetup', e.target.value)}
                        placeholder="Ej. 0"
                        className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Métrica de Éxito del Negocio (KPI)</label>
                    <textarea 
                      value={initiative.businessMetric || ''}
                      onChange={(e) => updateInitiativeField('businessMetric', e.target.value)}
                      placeholder="Ej. Reducción de tiempo de revisión, 0 multas por cálculo erróneo..."
                      className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                      rows={2}
                    />
                  </div>
                </div>

                {/* Right Column: Calculations & Results */}
                <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-indigo-950 border-b border-indigo-200 pb-2 mb-4 flex items-center gap-1.5">
                      <TrendingUp size={16} className="text-indigo-600" />
                      Resultados y Retorno Financiero
                    </h3>
                    
                    <div className="space-y-3 text-sm">
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-indigo-100 flex justify-between items-center">
                        <span className="text-gray-600 text-xs font-medium">Costo Actual (AS-IS):</span>
                        <span className="font-bold text-gray-800 text-sm">
                          ${costoTotalAsIs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mes
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-lg shadow-sm border border-indigo-100 flex justify-between items-center">
                        <span className="text-gray-600 text-xs font-medium">Horas Ahorradas:</span>
                        <span className="font-bold text-indigo-700 text-sm">
                          {horasAhorradasMes.toFixed(1)} hrs / mes
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-lg shadow-sm border border-indigo-100 flex justify-between items-center">
                        <span className="text-gray-600 text-xs font-medium">Ahorro Neto Mensual:</span>
                        <span className={`font-bold text-base ${ahorroNetoMensual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${ahorroNetoMensual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-lg shadow-sm border border-indigo-100 flex justify-between items-center">
                        <span className="text-gray-600 text-xs font-medium">Ahorro Neto Anual (12m):</span>
                        <span className={`font-bold text-base ${ahorroNetoAnual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${ahorroNetoAnual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-lg shadow-sm border border-indigo-100 flex justify-between items-center">
                        <span className="text-gray-600 text-xs font-medium">Inversión Total Desarrollo:</span>
                        <span className="font-bold text-gray-800 text-sm">
                          ${inversionTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-lg shadow-sm border border-indigo-200 flex justify-between items-center">
                        <span className="text-indigo-900 font-semibold text-xs">Retorno de Inversión (Payback):</span>
                        <span className="font-extrabold text-indigo-700 text-base">
                          {paybackMeses}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-indigo-800 bg-indigo-100/80 p-3 rounded-lg leading-relaxed">
                    🚀 <strong>Análisis ROI:</strong> El cálculo toma en cuenta los costos actuales (AS-IS), el modelo de costos IA (Fijo o Variable) y la inversión total de desarrollo para proyectar el periodo de recuperación (Payback).
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button 
                  onClick={() => setIsMetricsModalOpen(false)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm"
                >
                  Cerrar y Guardar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Link Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <LinkIcon size={20} className="text-blue-600" />
                Enlace de Drive / Externo
              </h2>
              <button 
                onClick={() => setIsLinkModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">URL del Enlace</label>
                <SyncedInput
                  type="url"
                  value={tempLink}
                  onChange={(e) => setTempLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              
              <div className="text-xs text-gray-500 mb-6">
                Pega aquí el enlace a la carpeta de Drive, documento, o cualquier otra URL relevante para esta iniciativa.
              </div>

              <div className="flex justify-between items-center">
                {initiative.driveLink ? (
                  <a 
                    href={initiative.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                  >
                    <ExternalLink size={16} /> Ir al enlace actual
                  </a>
                ) : (
                  <div></div>
                )}
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsLinkModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      onUpdate({ ...initiative, driveLink: tempLink });
                      setIsLinkModalOpen(false);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pause History Modal */}
      {isPauseHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-amber-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
                  <PauseCircle size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Historial de Pausas y Congelamiento
                  </h2>
                  <p className="text-xs text-gray-500">
                    Trazabilidad de eventos de pausa y su impacto en el cronograma
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsPauseHistoryModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-amber-50/60 border border-amber-200/80 rounded-lg p-3">
                  <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide">
                    Estado Actual
                  </div>
                  <div className="text-sm font-bold text-gray-900 mt-0.5 flex items-center gap-1.5">
                    {isPaused ? (
                      <span className="text-amber-700 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        En Pausa ({daysInCurrentPause} días)
                      </span>
                    ) : (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Activa / En Ejecución
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                    Pausas Acumuladas
                  </div>
                  <div className="text-sm font-bold text-gray-900 mt-0.5">
                    {totalOverallPauseDays} días en total
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                    Total Eventos
                  </div>
                  <div className="text-sm font-bold text-gray-900 mt-0.5">
                    {pauseHistory.length + (isPaused ? 1 : 0)} eventos
                  </div>
                </div>
              </div>

              {isPaused && (
                <div className="bg-amber-100/70 border border-amber-300 rounded-lg p-3.5 text-xs text-amber-950">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={15} className="text-amber-700" />
                    Pausa Activa en Curso
                  </div>
                  <div>
                    Pausado el <strong>{initiative.pausedAt}</strong> por <strong>{initiative.pausedBy || 'Usuario'}</strong>.
                  </div>
                  <div className="mt-1">
                    <strong>Motivo:</strong> <em>"{initiative.pauseReason || 'Sin motivo especificado'}"</em>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                  Registro Histórico de Pausas
                </h4>
                {pauseHistory.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-xs italic bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    No se registran pausas finalizadas anteriores.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pauseHistory.map((rec, rIdx) => (
                      <div key={rec.id || rIdx} className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-2xs hover:border-gray-300 transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-gray-800 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Pausa #{rIdx + 1}: {rec.pausedAt} ➜ {rec.resumedAt || 'En curso'}
                          </span>
                          <span className="font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full text-[11px]">
                            {rec.daysPaused ?? 0} días pausados
                          </span>
                        </div>
                        <div className="text-gray-600 mb-1">
                          <strong>Motivo:</strong> {rec.reason}
                        </div>
                        <div className="text-gray-500 text-[11px] flex flex-wrap gap-x-4">
                          <span>Pausado por: <strong>{rec.pausedBy || '—'}</strong></span>
                          <span>Reanudado por: <strong>{rec.resumedBy || '—'}</strong></span>
                        </div>
                        {rec.resumeComment && (
                          <div className="mt-1.5 pt-1.5 border-t border-gray-100 text-gray-600 italic text-[11px]">
                            <strong>Comentario al reanudar:</strong> {rec.resumeComment}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setIsPauseHistoryModalOpen(false)}
                className="px-4 py-1.5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
