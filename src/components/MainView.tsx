import React, { useState, useRef, useEffect } from "react";
import { Plus, ArrowRight, ArrowLeft, Trash2, Archive, RotateCcw, GanttChart, LayoutDashboard, Settings, Search, Calendar } from "lucide-react";
import { Initiative } from "../types";
import { getEmptyPhases } from "../data";
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

const AutoResizeTextarea = ({ value, onChange, className, minHeight = 40, placeholder }: { value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, className?: string, minHeight?: number, placeholder?: string }) => {
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
      textareaRef.current.style.height = "auto";
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
      placeholder={placeholder}
      rows={1}
      style={{ minHeight: `${minHeight}px`, resize: "none", overflow: "hidden" }}
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


const getAutomaticStatus = (progress: number) => {
  if (progress <= 10) return "Pendiente";
  if (progress <= 70) return "En proceso";
  if (progress <= 90) return "Ejecutado";
  return "Revisado";
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Pendiente":
      return "bg-gray-100 text-gray-700";
    case "En proceso":
      return "bg-blue-100 text-blue-700";
    case "Ejecutado":
      return "bg-orange-100 text-orange-700";
    case "Revisado":
      return "bg-green-100 text-green-700";
    case "Desestimado":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getProgressBarColor = (status: string) => {
  switch (status) {
    case "Pendiente":
      return "bg-gray-500";
    case "En proceso":
      return "bg-blue-500";
    case "Ejecutado":
      return "bg-orange-500";
    case "Revisado":
      return "bg-green-500";
    case "Desestimado":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

interface Props {
  title: string;
  setTitle: (s: string) => void;
  initiatives: Initiative[];
  onAdd: (init: Initiative) => void;
  onUpdate: (id: string, field: keyof Initiative, value: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  userProfile?: { name: string; email: string } | null;
  onLogout?: () => void;
  onOpenAgenda?: () => void;
  onOpenDashboard?: () => void;
  onOpenAdmin?: () => void;
}

export default function MainView({
  title,
  setTitle,
  initiatives,
  onAdd,
  onUpdate,
  onOpen,
  onDelete,
  userProfile,
  onLogout,
  onOpenAgenda,
  onOpenDashboard,
  onOpenAdmin,
}: Props) {
  const [filterResponsable, setFilterResponsable] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilterStart, setDateFilterStart] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const [availableAreas, setAvailableAreas] = useState<string[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<string[]>([]);

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'areas'));
        const areas = querySnapshot.docs.map(doc => doc.data().name || '').filter(Boolean);
        const uniqueAreas = Array.from(new Set(areas)).sort();
        setAvailableAreas(uniqueAreas);
      } catch (error) {
        console.error("Error fetching areas:", error);
      }
    };

    fetchAreas();
    
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const users = querySnapshot.docs.map(doc => doc.data().name || '').filter(Boolean);
        const uniqueNames = Array.from(new Set(users)).sort();
        setRegisteredUsers(uniqueNames);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    
    fetchUsers();
  }, []);

  const userName = userProfile?.name || "";
  
  const responsablesList = [...registeredUsers];

  const responsablesFiltro = ["Todos", ...responsablesList];
  
  const selectResponsableOptions = responsablesList;

  // Calculates the average progress of all tasks inside the initiative
  const getProgress = (init: Initiative) => {
    let totalTasks = 0;
    let totalProgress = 0;
    init.phases.forEach((p) => {
      p.tasks.forEach((t) => {
        totalTasks++;
        totalProgress += t.progress;
      });
    });
    return totalTasks === 0 ? 0 : Math.round(totalProgress / totalTasks);
  };

  const addInitiative = () => {
    const newInit: Initiative = {
      id: `init-${Date.now()}`,
      name: "Nueva Iniciativa",
      responsible: "",
      responsible2: "",
      startDate: "",
      endDate: "",
      phases: getEmptyPhases(),
    };
    onAdd(newInit);
  };

  const updateInitiative = (
    id: string,
    field: keyof Initiative,
    value: string,
  ) => {
    onUpdate(id, field, value);
  };

  const filteredInitiatives = initiatives.filter((init) => {
    const isArchived = init.status === "Desestimado";
    if (showArchived && !isArchived) return false;
    if (!showArchived && isArchived) return false;

    if (filterResponsable !== "Todos") {
      if (!(init.responsible || "").toLowerCase().includes(filterResponsable.toLowerCase())) return false;
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchTitle = init.name.toLowerCase().includes(q);
      const matchArea = (init.area || "").toLowerCase().includes(q);
      if (!matchTitle && !matchArea) return false;
    }

    if (dateFilterStart) {
      if (!init.startDate || init.startDate < dateFilterStart) return false;
    }

    if (dateFilterEnd) {
      if (!init.startDate || init.startDate > dateFilterEnd) return false;
    }

    const prog = getProgress(init);
    const currentStatus = init.status === "Desestimado" ? "Desestimado" : getAutomaticStatus(prog);
    
    if (filterStatus !== "Todos" && currentStatus !== filterStatus) return false;

    return true;
  }).sort((a, b) => {
    const statusOrder: { [key: string]: number } = {
      "Pendiente": 1,
      "En proceso": 2,
      "Ejecutado": 3,
      "Revisado": 4,
      "Desestimado": 5,
    };
    const progA = getProgress(a);
    const progB = getProgress(b);
    const statusA = a.status === "Desestimado" ? "Desestimado" : getAutomaticStatus(progA);
    const statusB = b.status === "Desestimado" ? "Desestimado" : getAutomaticStatus(progB);
    
    const rankA = statusOrder[statusA] || 99;
    const rankB = statusOrder[statusB] || 99;
    return rankA - rankB;
  });

  const stats = {
    total: initiatives.length,
    pendiente: 0,
    enProceso: 0,
    ejecutado: 0,
    revisado: 0,
    desestimado: 0,
  };

  initiatives.forEach((init) => {
    const prog = getProgress(init);
    const status =
      init.status === "Desestimado" ? "Desestimado" : getAutomaticStatus(prog);
    if (status === "Pendiente") stats.pendiente++;
    else if (status === "En proceso") stats.enProceso++;
    else if (status === "Ejecutado") stats.ejecutado++;
    else if (status === "Revisado") stats.revisado++;
    else if (status === "Desestimado") stats.desestimado++;
  });

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-full xl:max-w-[98%] 2xl:max-w-[1800px] bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        {/* Header Section */}
        <div className="p-6 border-b border-gray-200 bg-white flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full">
            <div className="flex items-center gap-4">
              {showArchived ? (
                <h2 className="text-3xl font-bold text-gray-800">
                  Iniciativas Desestimadas
                </h2>
              ) : (
                <SyncedInput
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  title="Editar Título"
                  className="text-3xl font-bold text-gray-800 outline-none border-b-2 border-transparent focus:border-blue-500 transition-colors bg-transparent w-full md:w-auto"
                />
              )}
            </div>
            {userProfile && (
              <div className="flex items-center gap-4 mt-4 md:mt-0">
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase">
                    {userProfile.email.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {userProfile.email}
                  </span>
                </div>
                {onOpenAdmin && (
                  <button
                    onClick={onOpenAdmin}
                    className="p-2 rounded-lg border transition-colors bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 flex items-center justify-center"
                    title="Administración"
                  >
                    <Settings size={18} />
                  </button>
                )}
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="bg-white text-gray-600 hover:text-red-600 px-4 py-2 rounded-full border border-gray-200 text-sm font-medium transition-colors"
                    title="Cerrar sesión"
                  >
                    Salir
                  </button>
                )}
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-4 w-full mt-2">
            <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 pb-4 w-full">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-gray-400" />
                </div>
                <SyncedInput
                  type="text"
                  placeholder="Buscar por título o área..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">Desde:</span>
                <SyncedInput
                  type="date"
                  value={dateFilterStart}
                  onChange={(e) => setDateFilterStart(e.target.value)}
                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">Hasta:</span>
                <SyncedInput
                  type="date"
                  value={dateFilterEnd}
                  onChange={(e) => setDateFilterEnd(e.target.value)}
                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white"
                />
              </div>
              
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
                <label className="text-sm font-medium text-gray-600 whitespace-nowrap">
                  Estado:
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-transparent border-none rounded-md px-1 py-1 text-sm outline-none focus:ring-0 text-gray-800 font-medium cursor-pointer"
                >
                  <option value="Todos">Todos ({stats.total})</option>
                  <option value="Pendiente">Pendientes ({stats.pendiente})</option>
                  <option value="En proceso">En proceso ({stats.enProceso})</option>
                  <option value="Ejecutado">Ejecutados ({stats.ejecutado})</option>
                  <option value="Revisado">Revisados ({stats.revisado})</option>
                  {showArchived && <option value="Desestimado">Desestimados ({stats.desestimado})</option>}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
                <label className="text-sm font-medium text-gray-600 whitespace-nowrap">
                  Responsable:
                </label>
                <select
                  value={filterResponsable}
                  onChange={(e) => setFilterResponsable(e.target.value)}
                  className="bg-transparent border-none rounded-md px-1 py-1 text-sm outline-none focus:ring-0 text-gray-800 font-medium cursor-pointer"
                >
                  {responsablesFiltro.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <button 
                onClick={() => {
                  setSearchQuery('');
                  setDateFilterStart('');
                  setDateFilterEnd('');
                  setFilterStatus('Todos');
                  setFilterResponsable('Todos');
                }}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                title="Restablecer filtros"
              >
                <RotateCcw size={18} />
              </button>

              <div className="flex-1 min-w-[20px]"></div>

              {!showArchived ? (
                <>
                  <button
                    onClick={addInitiative}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors whitespace-nowrap shadow-sm"
                  >
                    <Plus size={16} /> Agregar
                  </button>
                  <button
                    onClick={() => setShowArchived(true)}
                    className="p-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-md transition-colors flex items-center justify-center shadow-sm"
                    title="Iniciativas Desestimadas"
                  >
                    <Archive size={18} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowArchived(false)}
                  className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors flex items-center justify-center shadow-sm"
                  title="Volver a Iniciativas"
                >
                  <ArrowLeft size={18} />
                </button>
              )}

              {onOpenAgenda && (
                <button
                  onClick={onOpenAgenda}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100 shadow-sm text-sm font-medium"
                  title="Ver Agenda Semanal"
                >
                  <Calendar size={16} /> Agenda Semanal
                </button>
              )}

              {onOpenDashboard && (
                <button
                  onClick={onOpenDashboard}
                  className="p-2 rounded-lg border transition-colors bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 flex items-center justify-center shadow-sm"
                  title="Ver Dashboard"
                >
                  <LayoutDashboard size={18} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Summary Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-700 text-sm">
              <tr>
                <th className="px-6 py-4 font-semibold border-b border-gray-200 min-w-[300px] w-[35%]">
                  Descripción Iniciativa
                </th>
                <th className="px-6 py-4 font-semibold border-b border-gray-200 w-1/5">
                  Área Iniciativa
                </th>
                <th className="px-6 py-4 font-semibold border-b border-gray-200 w-1/5">
                  Responsable 1
                </th>
                <th className="px-6 py-4 font-semibold border-b border-gray-200 w-1/5">
                  Responsable 2
                </th>
                <th className="px-6 py-4 font-semibold border-b border-gray-200 text-center w-[130px]">
                  Progreso (%)
                </th>
                <th className="px-6 py-4 font-semibold border-b border-gray-200 text-center w-[140px]">
                  Estado
                </th>
                <th className="px-6 py-4 font-semibold border-b border-gray-200 text-center w-[140px]">
                  Fecha Inicio
                </th>
                <th className="px-6 py-4 font-semibold border-b border-gray-200 text-center w-[150px]">
                  Fecha Fin
                </th>
                <th className="px-6 py-4 font-semibold border-b border-gray-200 text-center w-[120px]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredInitiatives.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    {showArchived
                      ? "No hay iniciativas archivadas."
                      : "No hay iniciativas que coincidan con el filtro seleccionado."}
                  </td>
                </tr>
              ) : null}
              {filteredInitiatives.map((init) => {
                const avgProgress = getProgress(init);
                const currentStatus =
                  init.status === "Desestimado"
                    ? "Desestimado"
                    : getAutomaticStatus(avgProgress);
                return (
                  <tr
                    key={init.id}
                    className="hover:bg-gray-50/80 transition-colors group"
                  >
                    <td className="border-b border-gray-200 focus-within:bg-blue-50/50 transition-colors">
                      <AutoResizeTextarea
                        value={init.name}
                        onChange={(e) =>
                          updateInitiative(init.id, "name", e.target.value)
                        }
                        className="w-full h-full px-6 py-4 bg-transparent outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-800 whitespace-normal break-words"
                        placeholder="Descripción de la iniciativa..."
                        minHeight={60}
                      />
                    </td>
                    <td className="border-b border-gray-200 focus-within:bg-blue-50/50 transition-colors">
                      <select
                        value={init.area || ""}
                        onChange={(e) =>
                          updateInitiative(init.id, "area", e.target.value)
                        }
                        className="w-full h-full px-6 py-4 bg-transparent outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-800 cursor-pointer appearance-none"
                      >
                        <option value="" disabled>
                          Seleccionar área...
                        </option>
                        {availableAreas.map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border-b border-gray-200 focus-within:bg-blue-50/50 transition-colors">
                      <select
                        value={init.responsible || ""}
                        onChange={(e) =>
                          updateInitiative(
                            init.id,
                            "responsible",
                            e.target.value,
                          )
                        }
                        className="w-full h-full px-6 py-4 bg-transparent outline-none focus:ring-2 focus:ring-blue-500 text-gray-600 cursor-pointer appearance-none"
                      >
                        <option value="">
                          Seleccionar...
                        </option>
                        {selectResponsableOptions.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border-b border-gray-200 focus-within:bg-blue-50/50 transition-colors">
                      <select
                        value={init.responsible2 || ""}
                        onChange={(e) =>
                          updateInitiative(
                            init.id,
                            "responsible2",
                            e.target.value,
                          )
                        }
                        className="w-full h-full px-6 py-4 bg-transparent outline-none focus:ring-2 focus:ring-blue-500 text-gray-600 cursor-pointer appearance-none"
                      >
                        <option value="">
                          Seleccionar...
                        </option>
                        {selectResponsableOptions.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 border-b border-gray-200 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-full max-w-[80px] h-2.5 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(currentStatus)}`}
                            style={{ width: `${avgProgress}%` }}
                          ></div>
                        </div>
                        <span className="font-semibold text-gray-700 min-w-[3ch]">
                          {avgProgress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-b border-gray-200 text-center">
                      {currentStatus === "Desestimado" ? (
                        <span
                          className={`inline-block px-3 py-1.5 rounded-full font-medium text-xs text-center ${getStatusColor(currentStatus)}`}
                        >
                          Desestimado
                        </span>
                      ) : (
                        <select
                          value={currentStatus}
                          onChange={(e) => {
                            if (e.target.value === "Desestimado") {
                              setArchiveConfirmId(init.id);
                            } else {
                              updateInitiative(init.id, "status", "");
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full font-medium text-xs outline-none cursor-pointer appearance-none text-center ${getStatusColor(currentStatus)}`}
                          style={{ textAlignLast: "center" }}
                        >
                          <option
                            value="Pendiente"
                            disabled={currentStatus !== "Pendiente"}
                          >
                            Pendiente
                          </option>
                          <option
                            value="En proceso"
                            disabled={currentStatus !== "En proceso"}
                          >
                            En proceso
                          </option>
                          <option
                            value="Ejecutado"
                            disabled={currentStatus !== "Ejecutado"}
                          >
                            Ejecutado
                          </option>
                          <option
                            value="Revisado"
                            disabled={currentStatus !== "Revisado"}
                          >
                            Revisado
                          </option>
                          <option value="Desestimado">Desestimado</option>
                        </select>
                      )}
                    </td>
                    <td className="border-b border-gray-200 focus-within:bg-blue-50/50 transition-colors">
                      <SyncedInput
                        type="date"
                        value={init.startDate}
                        onChange={(e) =>
                          updateInitiative(init.id, "startDate", e.target.value)
                        }
                        className="w-full h-full px-6 py-4 bg-transparent outline-none text-center text-gray-600 focus:ring-2 focus:ring-blue-500 uppercase cursor-text"
                      />
                    </td>
                    <td className="border-b border-gray-200 focus-within:bg-blue-50/50 transition-colors">
                      <SyncedInput
                        type="date"
                        value={init.endDate}
                        onChange={(e) =>
                          updateInitiative(init.id, "endDate", e.target.value)
                        }
                        className="w-full h-full px-6 py-4 bg-transparent outline-none text-center text-gray-600 focus:ring-2 focus:ring-blue-500 uppercase cursor-text"
                      />
                    </td>
                    <td className="px-6 py-4 border-b border-gray-200 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {init.status === "Desestimado" ? (
                          <button
                            onClick={() =>
                              updateInitiative(init.id, "status", "")
                            }
                            className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-green-50 text-green-700 hover:bg-green-100 hover:shadow-sm font-medium text-sm transition-all"
                            title="Recuperar iniciativa"
                          >
                            <RotateCcw size={16} /> Recuperar
                          </button>
                        ) : (
                          <button
                            onClick={() => onOpen(init.id)}
                            className="inline-flex items-center justify-center p-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 hover:shadow-sm font-medium text-sm transition-all"
                            title="Plan de Trabajo"
                          >
                            <GanttChart size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirmId(init.id)}
                          className="p-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                          title="Eliminar iniciativa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Eliminar Iniciativa
            </h3>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de querer eliminar esta iniciativa? Esta acción no
              se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200 transition-colors"
              >
                No
              </button>
              <button
                onClick={() => {
                  onDelete(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors"
              >
                Sí
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {archiveConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Archivar Iniciativa
            </h3>
            <p className="text-gray-600 mb-6">
              ¿Quieres archivar esta iniciativa? Pasará a estado "Desestimado".
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setArchiveConfirmId(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200 transition-colors"
              >
                No
              </button>
              <button
                onClick={() => {
                  updateInitiative(archiveConfirmId, "status", "Desestimado");
                  setArchiveConfirmId(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                Sí
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
