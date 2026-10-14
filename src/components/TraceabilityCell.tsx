import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Initiative } from "../types";
import { getInitiativeTraceability } from "../utils/traceability";
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  CircleDot, 
  ArrowRight, 
  TrendingUp, 
  TrendingDown, 
  Layers,
  Sparkles,
  GanttChart,
  X,
  ChevronRight,
  ChevronDown,
  History,
  Pause,
  Play
} from "lucide-react";

interface Props {
  initiative: Initiative;
  onOpenPlan?: () => void;
}

export default function TraceabilityCell({ initiative, onOpenPlan }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isPauseSectionExpanded, setIsPauseSectionExpanded] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const trace = getInitiativeTraceability(initiative);
  const isDelayed = !trace.isPaused && trace.healthStatus === "delayed";

  const isBasicComplete = Boolean(
    initiative.name && 
    initiative.name.trim() !== "" && 
    initiative.name.trim() !== "Nueva Iniciativa" && 
    initiative.area && 
    initiative.area.trim() !== "" && 
    initiative.responsible && 
    initiative.responsible.trim() !== ""
  );

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTooltip((prev) => !prev);
  };

  // Lock body scroll and listen for Escape key when modal is open
  useEffect(() => {
    if (!showTooltip) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowTooltip(false);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showTooltip]);

  // Helper colors for phases
  const getPhaseColorBadge = (num: number, status: string) => {
    if (status === "upcoming") return "bg-gray-100 text-gray-600 border-gray-200";
    switch (num) {
      case 1:
        return "bg-blue-50 text-blue-700 border-blue-200";
      case 2:
        return "bg-rose-50 text-rose-700 border-rose-200";
      case 3:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case 4:
        return "bg-purple-50 text-purple-700 border-purple-200";
      case 5:
        return "bg-teal-50 text-teal-700 border-teal-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div 
      ref={cellRef}
      onClick={handleToggleClick}
      className={`relative flex flex-col justify-center py-1.5 px-2 text-xs select-none min-w-[210px] cursor-pointer rounded-lg border transition-all ${
        showTooltip 
          ? "bg-blue-50/90 border-blue-300 ring-2 ring-blue-100 shadow-xs" 
          : isDelayed
          ? "bg-red-50/90 border-red-300 ring-2 ring-red-200/90 hover:bg-red-100/90 hover:border-red-400 shadow-2xs"
          : "border-transparent hover:bg-slate-50/90 hover:border-blue-200 hover:shadow-2xs"
      }`}
      title="Haz clic para ver trazabilidad y avance de fases"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleToggleClick(e as unknown as React.MouseEvent);
        }
      }}
    >
      {/* 1. Vista a Primera Impresión (En la celda) */}
      {!isBasicComplete ? (
        <div className="flex flex-col gap-1 items-start w-full">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-300 text-amber-900 font-medium transition-colors shadow-2xs">
            <AlertTriangle size={13} className="text-amber-600 shrink-0" />
            <span className="font-semibold text-[11px]">Faltan datos básicos</span>
          </div>
          <span className="text-[10px] text-amber-700 font-medium">
            Completa Descripción, Área y Resp. 1
          </span>
        </div>
      ) : !trace.hasDates ? (
        <div className="flex flex-col gap-1 items-start w-full">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-medium transition-colors shadow-2xs">
            <AlertTriangle size={13} className="text-amber-600 shrink-0" />
            <span className="font-semibold text-[11px]">Sin cronograma</span>
          </div>
          <span className="text-[11px] text-gray-400 flex items-center gap-1 group-hover:text-blue-600">
            Clic para detalles <ChevronRight size={11} />
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 w-full">
          {/* Badge de Fase Actual y Salud */}
          <div className="flex items-center justify-between gap-1.5">
            {trace.isPaused ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-amber-50 text-amber-800 border-amber-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span className="truncate max-w-[145px]">⏸️ En Pausa</span>
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                  isDelayed 
                    ? "bg-red-100/90 text-red-950 border-red-300 font-bold shadow-2xs" 
                    : getPhaseColorBadge(trace.currentPhaseNum, trace.currentPhaseIndex === -1 ? "upcoming" : "current")
                }`}
              >
                {isDelayed ? (
                  <AlertTriangle size={11} className="text-red-600 shrink-0 stroke-[2.5]" />
                ) : trace.currentPhaseIndex >= 0 && trace.currentPhaseIndex <= 4 ? (
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0 bg-current" />
                ) : null}
                <span className="truncate max-w-[140px]">{trace.currentPhaseShort}</span>
              </span>
            )}

            {/* Micro tag de salud / Alerta */}
            {trace.isPaused && (
              <span className="text-[10px] font-medium text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300 shrink-0">
                {trace.pausedDays > 0 ? `${trace.pausedDays}d congelado` : "Pausado"}
              </span>
            )}
            {!trace.isPaused && trace.totalPausedDays > 0 && !isDelayed && (
              <span 
                className="text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 shrink-0"
                title={`Iniciativa con historial de pausas: ${trace.pauseHistory.length} pausa(s), +${trace.totalPausedDays} días agregados al cronograma`}
              >
                +{trace.totalPausedDays}d pausa
              </span>
            )}
            {isDelayed && (
              <span 
                className="inline-flex items-center gap-1 text-[10px] font-black text-white bg-red-600 border border-red-700 px-2 py-0.5 rounded-full shrink-0 shadow-xs animate-pulse"
                title={`⚠️ ¡Alerta de Atraso Crítico! Desfase de ${trace.delayPercent}% (Tiempo consumido: ${trace.timeProgressPercent}% vs Avance de tareas: ${trace.taskProgressPercent}%)`}
              >
                <AlertTriangle size={11} className="stroke-[2.5] text-white shrink-0" />
                <span>¡Atrasado! (-{trace.delayPercent}%)</span>
              </span>
            )}
            {!trace.isPaused && !isDelayed && trace.healthStatus === "ahead" && (
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                Adelantado
              </span>
            )}
            {!trace.isPaused && !isDelayed && trace.healthStatus === "ontrack" && (
              <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 shrink-0">
                Al día
              </span>
            )}
          </div>

          {/* Mini Línea de Tiempo Proporcional (9 Semanas: 2 + 5 + 2) */}
          <div className={`w-full flex items-center gap-1 h-2 rounded-full p-0.5 border overflow-hidden ${
            isDelayed ? "bg-red-100/90 border-red-300" : "bg-gray-100 border-gray-200"
          }`}>
            {trace.phases.map((p, idx) => {
              // Proportional flex weights: Phase 1 is 2w, Phase 2 is 5w, Phase 3 is 2w
              const flexWeight = trace.phases.length === 3 ? (idx === 1 ? 5 : 2) : (idx === 2 ? 5 : 1);
              let bg = "bg-gray-200";
              if (p.status === "completed") {
                bg = "bg-emerald-500";
              } else if (p.status === "current") {
                bg = isDelayed ? "bg-red-600 animate-pulse ring-1 ring-red-500" : "bg-blue-600 animate-pulse";
              }

              return (
                <div
                  key={idx}
                  style={{ flex: flexWeight }}
                  className={`h-full rounded-xs transition-all ${bg}`}
                  title={`${p.shortName}: ${p.status === "completed" ? "Completada" : p.status === "current" ? (isDelayed ? "En curso (con atraso)" : "En curso hoy") : "Pendiente"}`}
                />
              );
            })}
          </div>

          {/* Días y Avance Temporal + Hint de Clic */}
          <div className="flex items-center justify-between text-[11px] font-medium">
            <span className="flex items-center gap-1 text-gray-500">
              <Clock size={11} className="text-gray-400" />
              <span>Día {trace.elapsedDays}/{trace.totalDays}</span>
            </span>
            {isDelayed ? (
              <span className="font-extrabold text-red-700 flex items-center gap-1 bg-red-100/90 px-1.5 py-0.5 rounded border border-red-300 shadow-2xs">
                <AlertTriangle size={12} className="text-red-600 stroke-[2.5] shrink-0" />
                <span>Desfase -{trace.delayPercent}%</span>
                <ChevronRight size={12} className={`text-red-600 transition-transform ${showTooltip ? "rotate-90" : ""}`} />
              </span>
            ) : (
              <span className="font-semibold text-gray-700 flex items-center gap-0.5">
                <span>{trace.timeProgressPercent}% tiempo</span>
                <ChevronRight size={12} className={`text-blue-500 transition-transform ${showTooltip ? "rotate-90" : ""}`} />
              </span>
            )}
          </div>
        </div>
      )}

      {/* 2. Detalle al dar Clic (Modal centrado con backdrop, acomodado a cualquier pantalla sin cortarse) */}
      {showTooltip && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          onClick={() => setShowTooltip(false)}
        >
          <div 
            ref={popoverRef}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-auto max-h-[88vh] flex flex-col pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal - siempre fijo arriba */}
            <div className="flex items-start justify-between px-5 py-3.5 border-b border-gray-100 bg-white shrink-0 gap-2">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <Layers size={14} className="text-blue-600" />
                  <span>Trazabilidad Temporal & Fases</span>
                </div>
                <h4 className="font-bold text-base text-gray-900 mt-0.5 line-clamp-1">
                  {initiative.name || "Iniciativa"}
                </h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {trace.hasDates && (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${
                    isDelayed 
                      ? "bg-red-50 text-red-800 border-red-300 font-extrabold" 
                      : getPhaseColorBadge(trace.currentPhaseNum, trace.currentPhaseIndex === -1 ? 'upcoming' : 'current')
                  }`}>
                    Semana {trace.currentWeek || 0}/9
                  </span>
                )}
                {isDelayed && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-red-600 text-white flex items-center gap-1 shadow-2xs uppercase tracking-wide">
                    <AlertTriangle size={12} className="stroke-[2.5]" /> Atrasado
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTooltip(false);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer ml-1"
                  title="Cerrar"
                  aria-label="Cerrar detalle"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Modal Body - 100% visible y con scroll fluido en cualquier pantalla */}
            <div className="p-4 sm:p-5 overflow-y-auto min-h-0 flex-1 space-y-4 text-gray-800 overscroll-contain">

          {!isBasicComplete ? (
            <div className="flex flex-col gap-3 py-2 text-center items-center">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <AlertTriangle size={22} />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Datos Básicos Requeridos</p>
                <p className="text-xs text-gray-600 mt-1 max-w-[280px]">
                  Antes de colocar la Fecha de Inicio e ingresar al Plan de Trabajo, completa los siguientes 3 campos en la tabla:
                </p>
              </div>
              <div className="w-full text-left bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">1. Descripción:</span>
                  {Boolean(initiative.name?.trim() && initiative.name.trim() !== "Nueva Iniciativa") ? (
                    <span className="text-emerald-700 font-semibold text-[11px]">✓ Completo</span>
                  ) : (
                    <span className="text-red-600 font-bold text-[11px]">⚠️ Pendiente</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">2. Área Iniciativa:</span>
                  {Boolean(initiative.area?.trim()) ? (
                    <span className="text-emerald-700 font-semibold text-[11px]">✓ Completo</span>
                  ) : (
                    <span className="text-red-600 font-bold text-[11px]">⚠️ Pendiente</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">3. Responsable 1:</span>
                  {Boolean(initiative.responsible?.trim()) ? (
                    <span className="text-emerald-700 font-semibold text-[11px]">✓ Completo</span>
                  ) : (
                    <span className="text-red-600 font-bold text-[11px]">⚠️ Pendiente</span>
                  )}
                </div>
              </div>
            </div>
          ) : !trace.hasDates ? (
            <div className="flex flex-col gap-3 py-2 text-center items-center">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <AlertTriangle size={22} />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">Cronograma no programado</p>
                <p className="text-xs text-gray-500 mt-1 max-w-[280px]">
                  Para activar la línea de tiempo y trazabilidad de las 9 semanas, ingresa la Fecha de Inicio en la tabla o en el Plan de Trabajo.
                </p>
              </div>
              {onOpenPlan && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTooltip(false);
                    onOpenPlan();
                  }}
                  className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-medium text-xs hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                >
                  <GanttChart size={14} /> Configurar Plan de Trabajo
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Sección Desplegable de Trazabilidad Histórica de Pausas */}
              {(trace.isPaused || (trace.pauseHistory && trace.pauseHistory.length > 0)) && (
                <div className="bg-amber-50/70 border border-amber-300 rounded-xl overflow-hidden transition-all shadow-2xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPauseSectionExpanded(!isPauseSectionExpanded);
                    }}
                    className="w-full flex items-center justify-between p-2.5 bg-amber-50/90 hover:bg-amber-100/70 text-left transition-colors cursor-pointer select-none"
                    title={isPauseSectionExpanded ? "Contraer historial de pausas" : "Desplegar historial de pausas"}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <History size={14} className="text-amber-700 shrink-0" />
                      <span>Trazabilidad de Pausas ({trace.pauseHistory.length || (trace.isPaused ? 1 : 0)})</span>
                      <span className="text-[10px] text-amber-800 font-normal bg-amber-200/70 px-1.5 py-0.5 rounded-full ml-1">
                        +{trace.totalPausedDays}d
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {trace.isPaused ? (
                        <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                          En Pausa
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-semibold border border-emerald-200">
                          Resuelto
                        </span>
                      )}
                      <ChevronDown
                        size={15}
                        className={`text-amber-700 transition-transform duration-200 ${
                          isPauseSectionExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* Contenido desplegado */}
                  {isPauseSectionExpanded && (
                    <div className="p-3 pt-1 border-t border-amber-200/80 space-y-2.5 bg-amber-50/40">
                      {/* Resumen de impacto acumulado en el cronograma */}
                      <div className="text-[11px] text-amber-900 bg-white/80 p-2 rounded-lg border border-amber-200/80 flex items-center justify-between">
                        <span>Días congelados acumulados:</span>
                        <strong className="text-amber-950 font-bold">
                          {trace.totalPausedDays} días sumados al fin
                        </strong>
                      </div>

                      {/* Lista cronológica completa de todas las pausas */}
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
                        {/* Fallback si está en pausa pero pauseHistory estuviera vacío */}
                        {trace.pauseHistory.length === 0 && trace.isPaused && (
                          <div className="bg-white p-2.5 rounded-lg border border-amber-300 text-xs space-y-1">
                            <div className="flex items-center justify-between font-semibold text-amber-900">
                              <span>Pausa Actual</span>
                              <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-bold">En curso</span>
                            </div>
                            <p className="text-[11px] text-gray-700">
                              <span className="font-semibold text-gray-900">Motivo:</span> {trace.pauseReason || "No especificado"}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              Pausado el: {trace.pausedAt || "Hoy"} • {trace.pausedDays} días transcurridos
                            </p>
                          </div>
                        )}

                        {trace.pauseHistory.map((entry, idx) => {
                          const isActive = !entry.resumedAt && trace.isPaused;
                          return (
                            <div
                              key={entry.id || idx}
                              className={`p-2.5 rounded-lg border text-xs space-y-1.5 transition-all ${
                                isActive
                                  ? "bg-amber-100/60 border-amber-300 shadow-2xs"
                                  : "bg-white border-gray-200 hover:border-amber-200"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-gray-800 flex items-center gap-1.5 text-[11px]">
                                  <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px] font-bold">
                                    {idx + 1}
                                  </span>
                                  Pausa #{idx + 1}
                                </span>
                                {isActive ? (
                                  <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                    ⏸️ En curso ({trace.pausedDays}d)
                                  </span>
                                ) : (
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-1.5 py-0.2 rounded">
                                    ✓ Reanudada (+{entry.daysPaused || 0}d)
                                  </span>
                                )}
                              </div>

                              {/* Motivo del inconveniente */}
                              <div className="bg-amber-50/60 p-2 rounded border border-amber-200/60 text-[11px] text-amber-950 leading-relaxed">
                                <span className="font-bold text-amber-900">Motivo:</span>{" "}
                                <span>{entry.reason}</span>
                              </div>

                              {/* Fechas de pausa y reanudación con autoría */}
                              <div className="flex flex-col gap-1 text-[10px] text-gray-600 pt-1 border-t border-gray-100">
                                <div className="flex items-center justify-between">
                                  <span>📅 Pausado: <strong>{entry.pausedAt}</strong></span>
                                  {entry.pausedBy && <span>Por: <strong className="text-gray-800">{entry.pausedBy}</strong></span>}
                                </div>
                                {entry.resumedAt && (
                                  <div className="flex items-center justify-between text-emerald-800">
                                    <span>▶️ Reanudado: <strong>{entry.resumedAt}</strong></span>
                                    {entry.resumedBy && <span>Por: <strong className="text-gray-800">{entry.resumedBy}</strong></span>}
                                  </div>
                                )}
                                {entry.resumeComment && (
                                  <div className="mt-0.5 text-[10px] text-emerald-950 bg-emerald-50/80 p-1.5 rounded border border-emerald-200/80 leading-relaxed">
                                    <span className="font-bold text-emerald-900">Solución / Comentario al retomar:</span> {entry.resumeComment}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tarjetas de métricas rápidas */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Calendar size={11} /> Inicio → Fin MVP
                  </span>
                  <span className="text-xs font-bold text-gray-800 mt-0.5">
                    {trace.startDateFormatted}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    al {trace.isPaused && trace.projectedEndDateFormatted ? (
                      <span className="text-amber-800 font-bold" title={`Fecha fin proyectada por la pausa activa actual (+${trace.pausedDays}d)`}>
                        {trace.projectedEndDateFormatted} (proy.)
                      </span>
                    ) : (
                      trace.endDateFormatted
                    )}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Clock size={11} /> Tiempo Transcurrido
                  </span>
                  <span className="text-xs font-bold text-blue-700 mt-0.5">
                    {trace.elapsedDays} de {trace.netTotalDays || trace.totalDays} días netos
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Quedan {trace.remainingDays} días ({100 - trace.timeProgressPercent}%)
                    {trace.totalPausedDays > 0 && (
                      <span className="text-amber-700 font-medium ml-1">
                        (+{trace.totalPausedDays}d pausa)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Comparativa: % Tiempo vs % Avance de Tareas */}
              <div className={`p-3 rounded-xl border transition-all ${
                isDelayed 
                  ? "bg-red-50/90 border-2 border-red-400 shadow-xs" 
                  : "bg-white p-2.5 rounded-lg border border-gray-200"
              }`}>
                {isDelayed ? (
                  /* ALERTA DE ATRASO DESTACADA */
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-red-200">
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-red-100 border border-red-300 flex items-center justify-center text-red-600 shrink-0 mt-0.5 shadow-2xs">
                          <AlertTriangle size={18} className="stroke-[2.5] text-red-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-red-950 uppercase tracking-wide">
                              ⚠️ ALERTA: PROYECTO ATRASADO
                            </span>
                          </div>
                          <p className="text-[11px] font-bold text-red-700 mt-0.5">
                            Desfase crítico de {trace.delayPercent}% entre tiempo y tareas
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 shadow-2xs">
                        {trace.healthLabel}
                      </span>
                    </div>

                    {/* Doble barra comparativa con estilo de advertencia */}
                    <div className="space-y-2 text-[11px] bg-white/90 p-2.5 rounded-lg border border-red-200/90 shadow-2xs">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-600 font-semibold flex items-center gap-1">
                            <Clock size={12} className="text-gray-500" />
                            Tiempo consumido del proyecto:
                          </span>
                          <span className="font-extrabold text-gray-900 bg-gray-100 px-1.5 py-0.2 rounded border border-gray-200">
                            {trace.timeProgressPercent}%
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-slate-600 rounded-full transition-all"
                            style={{ width: `${trace.timeProgressPercent}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-red-700 font-bold flex items-center gap-1">
                            <AlertTriangle size={12} className="text-red-600 shrink-0" />
                            Avance real de tareas (debería ser al menos {trace.timeProgressPercent}%):
                          </span>
                          <span className="font-black text-red-700 bg-red-100 px-1.5 py-0.2 rounded border border-red-300">
                            {trace.taskProgressPercent}%
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-red-100 rounded-full overflow-hidden border border-red-300/80">
                          <div 
                            className="h-full bg-red-500 rounded-full transition-all"
                            style={{ width: `${Math.max(3, trace.taskProgressPercent)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Caja de diagnóstico y llamado a la acción */}
                    <div className="bg-red-100/95 border border-red-300 rounded-lg p-2.5 text-[11px] text-red-950 space-y-1">
                      <p className="font-bold text-red-900 flex items-start gap-1.5">
                        <TrendingDown size={14} className="text-red-600 shrink-0 mt-0.5 stroke-[2.5]" />
                        <span>{trace.healthDescription}</span>
                      </p>
                      <p className="text-[10px] text-red-800 leading-relaxed pt-0.5">
                        El proyecto está consumiendo cronograma sin el avance correspondiente en las tareas. Se requiere acelerar las entregas en el Plan de Trabajo para evitar reprogramaciones o desvíos del hito Fin (MVP).
                      </p>
                    </div>

                    {onOpenPlan && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowTooltip(false);
                          onOpenPlan();
                        }}
                        className="w-full py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <GanttChart size={13} /> Ir al Plan de Trabajo a actualizar tareas
                      </button>
                    )}
                  </div>
                ) : (
                  /* Modo Normal (Al día / Adelantado / En pausa) */
                  <>
                    <div className="flex items-center justify-between text-xs font-semibold mb-2">
                      <span className="text-gray-700 flex items-center gap-1">
                        {trace.healthStatus === "paused" && <AlertTriangle size={14} className="text-amber-600" />}
                        {trace.healthStatus === "ahead" && <TrendingUp size={14} className="text-emerald-500" />}
                        {trace.healthStatus === "ontrack" && <Sparkles size={14} className="text-blue-500" />}
                        <span>Salud: {trace.healthLabel}</span>
                      </span>
                      <span className="text-[11px] font-medium text-gray-400">
                        {trace.healthStatus === "paused" ? "Cronograma congelado" : "Ritmo del proyecto"}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">⏱️ Tiempo consumido:</span>
                        <span className="font-bold text-gray-700">{trace.timeProgressPercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${trace.timeProgressPercent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-gray-500 flex items-center gap-1">
                          {trace.taskProgressPercent < trace.timeProgressPercent ? (
                            <AlertTriangle size={12} className="text-amber-600 shrink-0" />
                          ) : (
                            <span>🎯</span>
                          )}
                          <span>Avance real de tareas:</span>
                        </span>
                        <span className={`font-bold ${
                          trace.taskProgressPercent < trace.timeProgressPercent
                            ? "text-amber-700 bg-amber-50 px-1 rounded border border-amber-200"
                            : "text-emerald-600"
                        }`}>
                          {trace.taskProgressPercent}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            trace.taskProgressPercent < trace.timeProgressPercent
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${trace.taskProgressPercent}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-500 mt-2 bg-slate-50 p-1.5 rounded border border-slate-100 italic">
                      {trace.healthDescription}
                    </p>
                  </>
                )}
              </div>

              {/* Trazabilidad por cada fase */}
              <div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Estado de las {trace.phases.length} Fases (9 Semanas)
                </span>
                <div className="space-y-1">
                  {trace.phases.map((p, pIdx) => {
                    const isCurrent = p.status === "current";
                    const isCompleted = p.status === "completed";

                    return (
                      <div 
                        key={pIdx}
                        className={`flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                          isCurrent 
                            ? isDelayed
                              ? "bg-red-50 border border-red-300 font-semibold text-red-950"
                              : "bg-blue-50 border border-blue-200 font-semibold text-blue-900" 
                            : isCompleted
                            ? "bg-emerald-50/50 text-gray-700"
                            : "bg-gray-50/60 text-gray-400"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate pr-2">
                          {isCompleted ? (
                            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                          ) : isCurrent ? (
                            <CircleDot size={13} className={`shrink-0 animate-pulse ${isDelayed ? "text-red-600" : "text-blue-600"}`} />
                          ) : (
                            <div className="w-3 h-3 rounded-full border border-gray-300 shrink-0" />
                          )}
                          <span className="truncate">{p.shortName}</span>
                          {isCurrent && isDelayed && (
                            <span className="text-[9px] bg-red-100 text-red-900 border border-red-300 font-black px-1.5 py-0.2 rounded shrink-0">
                              ⚠️ Fase con atraso
                            </span>
                          )}
                          {trace.isPaused && !isCompleted && (
                            <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.2 rounded shrink-0">
                              ⏸ Pausada
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 text-[11px]">
                          <span className={isCurrent ? (isDelayed ? "text-red-700 font-bold" : "text-blue-700 font-medium") : "text-gray-400"}>
                            {p.startDateStr && p.endDateStr ? `${p.startDateStr} - ${p.endDateStr}` : "—"}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                            isCompleted ? "bg-emerald-100 text-emerald-700" :
                            isCurrent ? (isDelayed ? "bg-red-200 text-red-900 font-extrabold" : "bg-blue-200 text-blue-800") : "bg-gray-100 text-gray-500"
                          }`}>
                            {p.progress}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
            </div>

            {/* Footer fijo del Modal - siempre visible sin importar el scroll */}
            <div className="shrink-0 px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
              <span className="text-[11px] text-gray-500 font-medium truncate max-w-[200px]" title={trace.hasDates ? trace.currentPhaseName : "Sin cronograma"}>
                {trace.hasDates ? trace.currentPhaseName : "Sin cronograma"}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowTooltip(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
                {onOpenPlan && isBasicComplete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTooltip(false);
                      onOpenPlan();
                    }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition-colors cursor-pointer ${
                      isDelayed ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    <span>Ver Plan de Trabajo</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
