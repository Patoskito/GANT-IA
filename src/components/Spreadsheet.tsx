import React, { useRef, useEffect, useState } from 'react';
import { Download, ArrowLeft, Plus, Minus, TrendingUp, X, Link as LinkIcon, ExternalLink } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Initiative, Task, Phase } from '../types';

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

const formatWeekHeader = (date: Date) => {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

export default function Spreadsheet({ initiative, onUpdate, onBack }: Props) {
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [tempLink, setTempLink] = useState(initiative.driveLink || "");
  const data = initiative.phases;

  // Timeline Calculations
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
  let days: Date[] = [];
  let weeks: Date[][] = [];
  if (projectStart && projectEnd) {
    if (projectStart > projectEnd) {
      const temp = projectStart;
      projectStart = projectEnd;
      projectEnd = temp;
    }

    durationDays = Math.round((projectEnd.getTime() - projectStart.getTime()) / (1000 * 3600 * 24)) + 1;

    // Expand start to nearest Monday
    const startMonday = new Date(projectStart);
    const startDay = startMonday.getDay();
    startMonday.setDate(startMonday.getDate() - (startDay === 0 ? 6 : startDay - 1));

    // Expand end to nearest Sunday
    const endSunday = new Date(projectEnd);
    const endDay = endSunday.getDay();
    endSunday.setDate(endSunday.getDate() + (endDay === 0 ? 0 : 7 - endDay));

    let curr = new Date(startMonday);
    while (curr <= endSunday) {
      days.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }

    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
  }

  const exportToExcel = () => {
    const wsData = [
      ["TAREA", "ASIGNADO A", "PROGRESO", "INICIO", "FIN"]
    ];

    data.forEach((phase) => {
      wsData.push([phase.name, "", "", "", ""]);
      phase.tasks.forEach((task) => {
        wsData.push([task.name, task.assignedTo, `${task.progress}%`, task.start, task.end]);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plan de Trabajo");
    XLSX.writeFile(wb, `plan_de_trabajo_${initiative.name.replace(/\s+/g, '_')}.xlsx`);
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
    onUpdate({
      ...initiative,
      phases: data.map(p => {
        if (p.id !== phaseId) return p;
        return {
          ...p,
          tasks: [...p.tasks, {
            id: `task-${Date.now()}`,
            name: "Nueva tarea",
            assignedTo: "",
            progress: 0,
            start: "",
            end: ""
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
              const numValue = value === '' ? 0 : Number(value);
              updatedTask.progress = numValue;
              
              const today = new Date().toISOString().split('T')[0];
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
      {/* Top Bar / Header */}
      <div className="bg-white border-b border-gray-300 p-4 flex justify-between items-center shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            title="Volver a Iniciativas"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Plan de trabajo: {initiative.name}</h1>
            <div className="text-sm text-gray-500 mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">R. I:</span>
                <span className="text-gray-700 font-medium">{initiative.responsible || 'Sin Asignar'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">R. I 2:</span>
                <SyncedInput 
                  type="text" 
                  value={initiative.responsible2 || ''} 
                  onChange={(e) => updateInitiativeField('responsible2', e.target.value)}
                  className="border border-gray-300 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  placeholder="Nombre..."
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">Área Iniciativa:</span>
                <span className="text-gray-700 bg-gray-100 px-2 py-0.5 rounded font-medium">{initiative.area || 'Sin Asignar'}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">Responsable de Área:</span>
                <SyncedInput 
                  type="text" 
                  value={initiative.areaResponsible || ''} 
                  onChange={(e) => updateInitiativeField('areaResponsible', e.target.value)}
                  className="border border-gray-300 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  placeholder="Nombre..."
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">Contacto:</span>
                <SyncedInput 
                  type="text" 
                  value={initiative.areaContact || ''} 
                  onChange={(e) => updateInitiativeField('areaContact', e.target.value)}
                  className="border border-gray-300 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-500 bg-white w-48"
                  placeholder="Tel / Email"
                />
                <button
                  onClick={() => {
                    setTempLink(initiative.driveLink || '');
                    setIsLinkModalOpen(true);
                  }}
                  className={`p-1 rounded transition-colors ${initiative.driveLink ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`}
                  title="Enlace de Drive / Externo"
                >
                  <LinkIcon size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-sm text-right flex flex-col gap-1">
            <div className="flex justify-end gap-2 items-center">
              <span className="text-gray-500 font-medium">Días del Proyecto:</span>
              <span className="text-gray-800 font-semibold">{durationDays > 0 ? durationDays : '-'}</span>
            </div>
            <div className="flex justify-end gap-2 items-center mt-1">
              <span className="text-gray-500 w-24">Inicio:</span> 
              <span className="text-gray-800 font-medium w-24 text-right">
                {initiative.startDate || '-'}
              </span>
            </div>
            <div className="flex justify-end gap-2 items-center">
              <span className="text-gray-500 w-24">Fin:</span> 
              <span className="text-gray-800 font-medium w-24 text-right">
                {initiative.endDate || '-'}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setIsMetricsModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded transition-colors"
            >
              <TrendingUp size={16} />
              Métricas de Negocio
            </button>
            <div className="flex gap-2">
              <button 
                onClick={addPhase}
                className="flex flex-1 items-center justify-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
              >
                <Plus size={16} />
                Fase
              </button>
              <button 
                onClick={exportToExcel}
                className="flex flex-1 items-center justify-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors"
              >
                <Download size={16} />
                Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Spreadsheet Container */}
      <div className="flex-1 overflow-hidden p-4 md:p-8 flex flex-col">
        <div className="bg-white border border-gray-300 shadow-sm rounded-sm overflow-auto flex-1 relative">
          <table className="w-max min-w-full text-left border-collapse text-sm whitespace-nowrap">
            <thead className="sticky top-0 z-20">
              <tr className="bg-[#5a5a5a] text-white">
                <th rowSpan={3} className="border border-gray-400 font-semibold px-3 py-2 min-w-[700px]">TAREA</th>
                <th rowSpan={3} className="border border-gray-400 font-semibold px-3 py-2 text-center min-w-[250px]">ASIGNADO A</th>
                <th rowSpan={3} className="border border-gray-400 font-semibold px-1 py-2 text-center w-16 min-w-[55px] max-w-[65px] text-xs">PROGRESO</th>
                <th rowSpan={3} className="border border-gray-400 font-semibold px-3 py-2 text-center min-w-[140px]">INICIO</th>
                <th rowSpan={3} className="border border-gray-400 font-semibold px-3 py-2 text-center min-w-[140px]">FIN</th>
                {weeks.map((week, idx) => (
                  <th key={idx} colSpan={7} className="border border-gray-400 font-semibold px-1 py-1 text-center bg-[#e5e5e5] text-gray-800 text-xs">
                    {formatWeekHeader(week[0])}
                  </th>
                ))}
              </tr>
              <tr className="bg-[#f2f2f2] text-gray-800">
                {days.map((day, idx) => (
                  <th key={idx} className="border border-gray-400 px-1 py-0.5 text-center text-[10px] w-6 min-w-[24px]">
                    {day.getDate()}
                  </th>
                ))}
              </tr>
              <tr className="bg-[#5a5a5a] text-white">
                {days.map((day, idx) => (
                  <th key={idx} className="border border-gray-400 px-1 py-0.5 text-center text-[10px] w-6 min-w-[24px]">
                    {['d','l','m','m','j','v','s'][day.getDay()]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((phase, phaseIndex) => {
                const phaseColors = ["bg-[#B8CCE4]", "bg-[#E6B8B7]", "bg-[#D8E4BC]", "bg-[#CCC0DA]", "bg-[#B7DEE8]"];
                const phaseBgColor = phaseColors[phaseIndex % phaseColors.length];
                
                return (
                <React.Fragment key={phase.id}>
                  {/* Phase Row */}
                  <tr className="border-b border-gray-300 group/phase">
                    <td className={`${phaseBgColor} border border-gray-300 p-0 font-bold text-gray-800 relative focus-within:ring-2 focus-within:ring-blue-500 focus-within:z-10`} colSpan={5}>
                      <div className="flex items-center justify-between w-full pr-2">
                        <SyncedInput
                          type="text"
                          value={phase.name}
                          onChange={(e) => updatePhaseName(phase.id, e.target.value)}
                          className="w-full px-3 py-2 bg-transparent outline-none font-bold"
                          title="Editar Fase"
                        />
                        <div className="flex items-center gap-1">
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
                    {days.map((_, i) => (
                      <td key={i} className="border border-gray-300 bg-white"></td>
                    ))}
                  </tr>
                  
                  {/* Task Rows */}
                  {phase.tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 transition-colors group/task">
                      <td className="border border-gray-300 p-0 relative focus-within:ring-2 focus-within:ring-blue-500 focus-within:z-10 bg-white group-hover:bg-gray-50 transition-colors align-top">
                        <div className="flex items-center justify-between w-full pr-1">
                          <AutoResizeTextarea
                            value={task.name}
                            onChange={(e) => updateTaskField(phase.id, task.id, 'name', e.target.value)}
                            className="w-full px-3 py-2 bg-transparent outline-none text-gray-800 text-xs sm:text-sm whitespace-normal break-words"
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
                      <td className="border border-gray-300 p-0 relative focus-within:ring-2 focus-within:ring-blue-500 focus-within:z-10 bg-white group-hover:bg-gray-50 transition-colors align-top">
                        <AutoResizeTextarea
                          value={task.assignedTo}
                          onChange={(e) => updateTaskField(phase.id, task.id, 'assignedTo', e.target.value)}
                          className="w-full px-3 py-2 bg-transparent outline-none text-gray-700 text-center text-xs sm:text-sm whitespace-normal break-words"
                        />
                      </td>
                      <td className="border border-gray-300 p-0 text-center relative focus-within:ring-2 focus-within:ring-blue-500 focus-within:z-10 bg-white group-hover:bg-gray-50 transition-colors align-top w-16 min-w-[55px] max-w-[65px]">
                        <div 
                          className="absolute inset-y-0 left-0 pointer-events-none transition-all duration-300" 
                          style={{ 
                            width: `${Math.min(100, Math.max(0, task.progress))}%`,
                            backgroundColor: `rgb(${255 - Math.round(109 * (Math.min(100, Math.max(0, task.progress)) / 100))}, ${255 - Math.round(50 * (Math.min(100, Math.max(0, task.progress)) / 100))}, ${255 - Math.round(35 * (Math.min(100, Math.max(0, task.progress)) / 100))})`
                          }}
                        ></div>
                        <div className="relative flex items-center justify-center h-full w-full min-h-[40px] px-1">
                          <SyncedInput
                            type="text"
                            value={task.progress}
                            onChange={(e) => {
                              let val = e.target.value.replace(/[^0-9]/g, '');
                              if (val !== '') {
                                let num = parseInt(val, 10);
                                if (num > 100) val = '100';
                                else val = num.toString();
                              }
                              updateTaskField(phase.id, task.id, 'progress', val);
                            }}
                            className="w-8 h-full py-1.5 bg-transparent outline-none text-right font-medium z-10 text-xs sm:text-sm mix-blend-multiply"
                          />
                          <span className="pl-0.5 font-medium pointer-events-none text-gray-700 mix-blend-multiply text-xs sm:text-sm">%</span>
                        </div>
                      </td>
                      <td className="border border-gray-300 p-0 relative focus-within:ring-2 focus-within:ring-blue-500 focus-within:z-10 bg-white group-hover:bg-gray-50 transition-colors align-top">
                        <SyncedInput
                          type="date"
                          value={task.start}
                          onChange={(e) => updateTaskField(phase.id, task.id, 'start', e.target.value)}
                          className="w-full h-full min-h-[40px] px-3 py-1.5 bg-transparent outline-none text-gray-600 text-center text-xs sm:text-sm cursor-text uppercase"
                        />
                      </td>
                      <td className="border border-gray-300 p-0 relative focus-within:ring-2 focus-within:ring-blue-500 focus-within:z-10 bg-white group-hover:bg-gray-50 transition-colors align-top">
                        <SyncedInput
                          type="date"
                          value={task.end}
                          onChange={(e) => updateTaskField(phase.id, task.id, 'end', e.target.value)}
                          className="w-full h-full min-h-[40px] px-3 py-1.5 bg-transparent outline-none text-gray-600 text-center text-xs sm:text-sm cursor-text uppercase"
                        />
                      </td>
                      {days.map((day, i) => {
                        const taskStart = parseDate(task.start);
                        const taskEnd = parseDate(task.end);
                        let bgColor = "bg-white group-hover:bg-gray-50";
                        let tooltipText = "";

                        if (taskStart && taskEnd && day >= taskStart && day <= taskEnd) {
                          const taskDuration = Math.round((taskEnd.getTime() - taskStart.getTime()) / (1000 * 3600 * 24)) + 1;
                          const daysPassed = Math.round((day.getTime() - taskStart.getTime()) / (1000 * 3600 * 24));
                          const completedDays = Math.round((task.progress / 100) * taskDuration);
                          const remainingPercent = Math.max(0, 100 - task.progress);

                          if (daysPassed < completedDays) {
                            bgColor = "bg-[#92CDDC]"; // Celeste for completed progress
                            tooltipText = `[Avance] Tarea: ${task.name}\nProgreso: ${task.progress}%\nFecha: ${day.toLocaleDateString()}`;
                          } else {
                            bgColor = "bg-[#8064a2]"; // Purple for remaining
                            tooltipText = `[Pendiente / Falta] Tarea: ${task.name}\nFalta: ${remainingPercent}%\nFecha: ${day.toLocaleDateString()}`;
                          }
                        }

                        return (
                          <td 
                            key={i} 
                            className={`border border-gray-300 ${bgColor} transition-colors min-w-[24px] cursor-pointer`}
                            title={tooltipText}
                          ></td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
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
          const num = val === '' ? undefined : parseFloat(val);
          updateInitiativeField(field, isNaN(num as number) ? 0 : num);
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
    </div>
  );
}
