import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Trash2, Copy, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Initiative, WeeklyTask } from '../types';
import { useWeeklyTasks } from '../hooks/useWeeklyTasks';

// Helper to get ISO week information
function getISOWeekInfo(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

function getWeekString(date: Date) {
  const { year, week } = getISOWeekInfo(date);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function getWeekDateRange(year: number, week: number) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  const end = new Date(ISOweekStart);
  end.setDate(end.getDate() + 6);

  const format = (d: Date) => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  return `${format(ISOweekStart)} - ${format(end)}`;
}

function getDateFromWeekId(weekId: string) {
  const [year, week] = weekId.split('-W').map(Number);
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return ISOweekStart;
}

function generateTraceId(task: WeeklyTask, initiatives: Initiative[]) {
  if (task.frozenTraceId) return task.frozenTraceId;
  
  const init = initiatives.find(i => i.id === task.initiativeId);
  
  const getPrefix = (text?: string) => text ? text.substring(0, 3).toUpperCase() : 'XXX';
  const getRespInitials = (name?: string) => {
    if (!name) return 'XX';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const areaStr = getPrefix(init?.area);
  const initStr = getPrefix(init?.name);
  const respStr = getRespInitials(task.responsible);
  const rootId = (task.rootTaskId || task.id).slice(-4).toUpperCase();
  
  return `${areaStr}-${initStr}-${respStr}-${rootId}`;
}

interface Props {
  onBack: () => void;
  initiatives: Initiative[];
  userProfile?: { name: string; email: string } | null;
}

const STATUSES: ('Pendiente' | 'En proceso' | 'Cerrado')[] = ['Pendiente', 'En proceso', 'Cerrado'];

const SyncedTextarea = ({ value, onChange, ...props }: any) => {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value);
    }
  }, [value, isFocused]);
  return (
    <textarea
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

export default function WeeklyAgenda({ onBack, initiatives, userProfile }: Props) {
  const { tasks, loading, addTask, updateTask, deleteTask } = useWeeklyTasks();
  
  // States
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterResponsible, setFilterResponsible] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [registeredUsers, setRegisteredUsers] = useState<string[]>([]);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [closingTask, setClosingTask] = useState<WeeklyTask | null>(null);
  const [closeReasonText, setCloseReasonText] = useState("");
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const usersList = querySnapshot.docs
          .map(doc => doc.data().name)
          .filter(Boolean);
        const uniqueUsers = Array.from(new Set(usersList)).sort();
        setRegisteredUsers(uniqueUsers as string[]);
      } catch (e) {
        console.error("Error fetching users", e);
      }
    };
    fetchUsers();
  }, []);
  
  const { year, week } = useMemo(() => getISOWeekInfo(currentDate), [currentDate]);
  const currentWeekId = `${year}-W${week.toString().padStart(2, '0')}`;
  
  const nextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };
  
  const prevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const currentWeekTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks
      .filter(t => t.weekId === currentWeekId)
      .filter(t => filterResponsible === "Todos" || t.responsible === filterResponsible)
      .filter(t => {
        if (!query) return true;
        const traceId = generateTraceId(t, initiatives).toLowerCase();
        const rawId = (t.id || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const prevDesc = (t.previousDescription || '').toLowerCase();
        const histDesc = (t.history || []).map(h => h.description.toLowerCase()).join(' ');
        return (
          traceId.includes(query) ||
          rawId.includes(query) ||
          desc.includes(query) ||
          prevDesc.includes(query) ||
          histDesc.includes(query)
        );
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [tasks, currentWeekId, filterResponsible, searchQuery, initiatives]);

  const handleStatusChange = (task: WeeklyTask, newStatus: string) => {
    if (newStatus === 'Cerrado' && task.status !== 'Cerrado') {
      setClosingTask(task);
      setCloseReasonText(task.closeReason || "");
    } else {
      updateTask(task.id, { status: newStatus as any });
    }
  };

  const handleConfirmClose = () => {
    if (closingTask) {
      updateTask(closingTask.id, {
        status: 'Cerrado',
        closeReason: closeReasonText
      });
      setClosingTask(null);
      setCloseReasonText("");
    }
  };

  const handleAddTask = (status: 'Pendiente' | 'En proceso' | 'Cerrado') => {
    const id = `wt-${Date.now()}`;
    const newTask: WeeklyTask = {
      id,
      description: '',
      initiativeId: '',
      responsible: userProfile?.name || '',
      responsible2: '',
      status,
      weekId: currentWeekId,
      createdAt: Date.now(),
      rootTaskId: id
    };
    addTask(newTask);
  };

  const handleCopyToNextWeek = (task: WeeklyTask) => {
    const d = getDateFromWeekId(task.weekId);
    d.setDate(d.getDate() + 7);
    const nextWeekId = getWeekString(d);
    
    const frozenId = task.frozenTraceId || generateTraceId(task, initiatives);

    const newHistory = [...(task.history || [])];
    if (task.description && task.description.trim() !== '') {
      newHistory.push({
        weekId: task.weekId,
        description: task.description
      });
    } else if (task.previousDescription && newHistory.length === 0) {
       // Migration for existing data that doesn't have history array but has previousDescription
       newHistory.push({
         weekId: task.copiedFromWeek || 'Anterior',
         description: task.previousDescription
       });
    }

    const newTask: WeeklyTask = {
      ...task,
      id: `wt-${Date.now()}`,
      description: '',
      status: 'Pendiente',
      previousDescription: task.description,
      history: newHistory,
      weekId: nextWeekId,
      copiedFromWeek: task.weekId,
      rootTaskId: task.rootTaskId || task.id,
      frozenTraceId: frozenId,
      createdAt: Date.now()
    };
    addTask(newTask);
    alert(`Tarea copiada a la semana ${nextWeekId} como Pendiente.`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-white border-b border-gray-200 p-4 shadow-sm flex items-center sticky top-0 z-30">
          <button onClick={onBack} className="p-2 mr-4 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Cargando Agenda...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm flex justify-between items-center shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            title="Volver"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Agenda Semanal</h1>
            <p className="text-sm text-gray-500">Planificación y gestión operativa</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Filtro:</span>
            <select
              value={filterResponsible}
              onChange={e => setFilterResponsible(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-blue-500 bg-white min-w-[140px]"
            >
              <option value="Todos">Todos los responsables</option>
              {registeredUsers.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Search bar for ID and keywords */}
          <div className="relative flex items-center">
            <Search size={15} className="absolute left-2.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por ID o texto..."
              className="pl-8 pr-7 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-[180px] sm:w-[220px] bg-white text-gray-800 placeholder-gray-400 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100"
                title="Limpiar búsqueda"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button onClick={prevWeek} className="p-1.5 hover:bg-white rounded shadow-sm text-gray-600 transition-all">
              <ChevronLeft size={20} />
            </button>
            <div className="text-center px-4 min-w-[180px]">
              <div className="font-bold text-gray-800 text-sm">Semana {week}</div>
              <div className="text-xs text-gray-500">{getWeekDateRange(year, week)}</div>
            </div>
            <button onClick={nextWeek} className="p-1.5 hover:bg-white rounded shadow-sm text-gray-600 transition-all">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-6 h-full min-w-[1000px] items-start">
          {STATUSES.map(status => {
            const columnTasks = currentWeekTasks.filter(t => t.status === status);
            return (
              <div key={status} className="flex-1 bg-gray-100/50 rounded-xl border border-gray-200 p-4 flex flex-col max-h-full">
                <div className="flex justify-between items-center mb-4 px-2">
                  <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    {status === 'Pendiente' && '📝'}
                    {status === 'En proceso' && '⏳'}
                    {status === 'Cerrado' && '✅'}
                    {status}
                    <span className="bg-gray-200 text-gray-600 text-xs py-0.5 px-2 rounded-full font-medium ml-1">
                      {columnTasks.length}
                    </span>
                  </h3>
                  <button
                    onClick={() => handleAddTask(status)}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title={`Agregar en ${status}`}
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {columnTasks.length === 0 ? (
                    <div className="text-center p-6 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                      No hay tareas
                    </div>
                  ) : (
                    columnTasks.map(task => {
                      const isClosed = task.status === 'Cerrado';
                      const isInProcess = task.status === 'En proceso';
                      const isCopied = (task.history && task.history.length > 0) || task.copiedFromWeek;
                      const isExpanded = expandedTasks[task.id] || false;
                      
                      let cardStyle = 'bg-gray-100 border-gray-300 hover:border-gray-400';
                      if (isClosed) {
                        cardStyle = 'bg-green-50 border-green-300 hover:border-green-400';
                      } else if (isCopied) {
                        cardStyle = 'bg-red-50 border-red-300 hover:border-red-400';
                      } else if (isInProcess) {
                        cardStyle = 'bg-blue-50 border-blue-300 hover:border-blue-400';
                      }

                      return (
                      <div key={task.id} className={`p-4 rounded-lg shadow-sm border transition-colors group relative flex flex-col min-h-[140px] justify-between ${cardStyle}`}>
                        
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-[10px] font-bold text-gray-500 bg-white/60 border border-gray-200/50 px-2 py-0.5 rounded-sm uppercase tracking-wide">
                              ID: {generateTraceId(task, initiatives)}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <select
                                value={task.status}
                                onChange={e => handleStatusChange(task, e.target.value)}
                                className="text-xs border border-gray-300 rounded px-2 py-0.5 font-medium outline-none focus:border-blue-500 cursor-pointer"
                                style={{
                                  backgroundColor: task.status === 'Pendiente' ? '#F3F4F6' : task.status === 'En proceso' ? '#DBEAFE' : '#D1FAE5',
                                  color: task.status === 'Pendiente' ? '#374151' : task.status === 'En proceso' ? '#1E40AF' : '#065F46'
                                }}
                              >
                                {STATUSES.map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                              
                              <button 
                                onClick={() => setExpandedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                                className="p-1 text-gray-500 hover:bg-gray-200/50 hover:text-gray-700 rounded transition-colors"
                                title={isExpanded ? "Ocultar detalles" : "Ver detalles"}
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>
                          </div>

                          <SyncedTextarea
                            value={task.description}
                            onChange={e => updateTask(task.id, { description: e.target.value })}
                            placeholder="Descripción de la tarea..."
                            className={`w-full text-sm font-medium text-gray-800 outline-none resize-y bg-transparent placeholder-gray-400 min-h-[64px] ${isExpanded || (isClosed && task.closeReason) ? 'mb-3' : 'mb-0'}`}
                            rows={3}
                          />

                          {isClosed && task.closeReason && (
                            <div className={`text-xs bg-green-100/50 border border-green-200 text-green-800 p-2 rounded-md ${isExpanded ? 'mb-3' : 'mb-0'}`}>
                              <span className="font-semibold block mb-0.5">Motivo de cierre:</span>
                              {task.closeReason}
                            </div>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="space-y-3 pt-3 border-t border-gray-200/50 mt-1">
                            {task.history && task.history.length > 0 ? (
                              <div className="text-xs text-gray-500 flex flex-col gap-2">
                                {task.history.map((h, i) => (
                                  <div key={i}>
                                    <span className="font-semibold text-gray-600 block mb-1">
                                      ↳ Sem. {h.weekId.includes('-W') ? h.weekId.split('-W')[1] : h.weekId}:
                                    </span>
                                    <span className="line-through italic">
                                      {h.description}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : task.copiedFromWeek ? (
                              <div className="text-xs text-gray-500">
                                <span className="font-semibold text-gray-600 block mb-1">
                                  ↳ Tarea arrastrada (Sem. {task.copiedFromWeek.split('-W')[1]}):
                                </span>
                                <span className="line-through italic">
                                  {task.previousDescription}
                                </span>
                              </div>
                            ) : null}

                            <div className="space-y-2">
                              <div>
                                <select
                                  value={task.initiativeId}
                                  onChange={e => updateTask(task.id, { initiativeId: e.target.value })}
                                  className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 text-gray-600 outline-none focus:border-blue-500 truncate bg-white"
                                >
                                  <option value="">-- Sin Iniciativa Vinculada --</option>
                                  {initiatives.map(init => {
                                    const areaStr = init.area ? `[${init.area}] ` : '';
                                    return (
                                      <option key={init.id} value={init.id}>
                                        {areaStr}{init.name || 'Sin nombre'}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                              
                              <div className="space-y-1.5 pt-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-gray-900 w-10 shrink-0">R.I.1:</span>
                                  <select
                                    value={task.responsible}
                                    onChange={e => updateTask(task.id, { responsible: e.target.value })}
                                    className="w-full text-xs font-semibold border border-gray-400 rounded px-2 py-1.5 text-gray-900 outline-none focus:border-blue-500 bg-gray-50"
                                  >
                                    <option value="">Seleccionar responsable 1...</option>
                                    {registeredUsers.map(u => (
                                      <option key={u} value={u}>{u}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-medium text-gray-600 w-10 shrink-0">R.I.2:</span>
                                  <select
                                    value={task.responsible2 || ''}
                                    onChange={e => updateTask(task.id, { responsible2: e.target.value })}
                                    className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 text-gray-700 outline-none focus:border-blue-500 bg-white"
                                  >
                                    <option value="">Seleccionar responsable 2...</option>
                                    {registeredUsers.map(u => (
                                      <option key={u} value={u}>{u}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              
                              <div className="flex justify-end items-center pt-1">
                                <div className="flex items-center gap-1 shrink-0">
                                  {!isClosed && (
                                    <button 
                                      onClick={() => handleCopyToNextWeek(task)} 
                                      className="text-blue-500 hover:text-blue-700 p-1.5 bg-white/80 rounded shadow-sm hover:shadow"
                                      title="Copiar a la siguiente semana"
                                    >
                                      <Copy size={14} />
                                    </button>
                                  )}
                                  <button onClick={() => setTaskToDelete(task.id)} className="text-red-400 hover:text-red-600 p-1.5 bg-white/80 rounded shadow-sm hover:shadow" title="Eliminar">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Eliminar Tarea</h3>
            <p className="text-gray-600 mb-6">¿Estás seguro de que deseas eliminar esta tarea de la agenda? Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setTaskToDelete(null)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteTask(taskToDelete);
                  setTaskToDelete(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 size={18} />
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Task Modal */}
      {closingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Cerrar Tarea</h3>
            <p className="text-gray-600 mb-4 text-sm">Por favor, indica el motivo o una breve descripción de cómo/por qué se cerró esta tarea.</p>
            
            <textarea
              value={closeReasonText}
              onChange={(e) => setCloseReasonText(e.target.value)}
              placeholder="Ej. Se completó el entregable con éxito..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-800 outline-none focus:border-blue-500 min-h-[100px] mb-6 resize-y"
              autoFocus
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setClosingTask(null);
                  setCloseReasonText("");
                }}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmClose}
                disabled={!closeReasonText.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                Confirmar cierre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
