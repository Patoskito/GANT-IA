import React, { useState } from 'react';
import { ArrowLeft, BarChart as BarChartIcon, TrendingUp, DollarSign, Clock, ShieldCheck } from 'lucide-react';
import { Initiative } from '../types';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardProps {
  initiatives: Initiative[];
  onBack: () => void;
}

const getAutomaticStatus = (progress: number) => {
  if (progress <= 10) return "Pendiente";
  if (progress <= 70) return "En proceso";
  if (progress <= 90) return "Ejecutado";
  return "Revisado";
};

const getHistoricalProgress = (init: Initiative, dateStr: string) => {
  let totalTasks = 0;
  let totalProgress = 0;
  init.phases.forEach((p) => {
    p.tasks.forEach((t) => {
      totalTasks++;
      if (t.progressHistory && t.progressHistory.length > 0) {
        let latestProgress = 0;
        let found = false;
        for (let i = t.progressHistory.length - 1; i >= 0; i--) {
          if (t.progressHistory[i].date <= dateStr) {
            latestProgress = t.progressHistory[i].progress;
            found = true;
            break;
          }
        }
        if (!found) {
          totalProgress += 0;
        } else {
          totalProgress += latestProgress;
        }
      } else {
        totalProgress += t.progress;
      }
    });
  });
  return totalTasks === 0 ? 0 : Math.round(totalProgress / totalTasks);
};

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

const COLORS: Record<string, string> = {
  "Pendiente": "#6b7280", // gray-500
  "En proceso": "#3b82f6", // blue-500
  "Ejecutado": "#f97316", // orange-500
  "Revisado": "#22c55e", // green-500
  "Desestimado": "#ef4444" // red-500
};

const AREA_COLORS = [
  "#2563eb", // blue
  "#16a34a", // green
  "#d97706", // amber
  "#9333ea", // purple
  "#db2777", // pink
  "#0891b2", // cyan
  "#4f46e5"  // indigo
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-sm rounded-md max-w-[300px]">
        <p className="font-semibold text-gray-800 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => {
          const desc = entry.payload[`${entry.dataKey}_full`] || entry.name;
          return (
            <div key={index} className="flex items-start gap-2 mb-2">
              <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: entry.color }} />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-600 line-clamp-3">{desc}</span>
                <span className="text-sm font-bold text-gray-800">{entry.value}% Progreso</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export default function DashboardView({ initiatives, onBack }: DashboardProps) {
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('Todos');
  const [timeGroupBy, setTimeGroupBy] = useState<'Año' | 'Mes' | 'Semana'>('Mes');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [startMonth, setStartMonth] = useState<number>(0);
  const [endMonth, setEndMonth] = useState<number>(11);

  // Financial Analysis Filters (Group -> Initiative)
  const activeInitiatives = initiatives.filter(i => i.status !== 'Desestimado');
  
  // Extract unique groups / areas
  const uniqueAreas = Array.from(new Set(initiatives.map(i => (i.area && i.area.trim() !== '') ? i.area.trim() : 'Sin Asignar')));
  const [selectedFinancialGroup, setSelectedFinancialGroup] = useState<string>(uniqueAreas[0] || 'Todos');

  // Filter initiatives for the selected group
  const groupFilteredInitiatives = activeInitiatives.filter(i => {
    const area = (i.area && i.area.trim() !== '') ? i.area.trim() : 'Sin Asignar';
    if (selectedFinancialGroup === 'Todos') return true;
    return area === selectedFinancialGroup;
  });

  const [selectedFinancialInitId, setSelectedFinancialInitId] = useState<string>(groupFilteredInitiatives[0]?.id || '');

  // Keep selected initiative valid when group changes
  React.useEffect(() => {
    if (groupFilteredInitiatives.length > 0) {
      if (!groupFilteredInitiatives.some(i => i.id === selectedFinancialInitId)) {
        setSelectedFinancialInitId(groupFilteredInitiatives[0].id);
      }
    } else {
      setSelectedFinancialInitId('');
    }
  }, [selectedFinancialGroup, groupFilteredInitiatives]);

  const selectedInitiative = activeInitiatives.find(i => i.id === selectedFinancialInitId) || groupFilteredInitiatives[0] || activeInitiatives[0];

  // Financial calculations for selected initiative
  const vol = selectedInitiative?.volumenMensual || 0;
  const tManual = selectedInitiative?.tiempoManualTarea || 0;
  const costH = selectedInitiative?.costoHoraHombre || 0;
  const fixedCurrent = selectedInitiative?.gastoFijoActual || 0;
  const costAsIs = (vol * tManual * costH) + fixedCurrent;

  const tIa = selectedInitiative?.tiempoIaTarea || 0;
  const tipoIa = selectedInitiative?.tipoCostoIa || 'Fijo';
  const tarifa = selectedInitiative?.tarifaIa || 0;
  const fixedNew = selectedInitiative?.gastoFijoNuevo || 0;
  const costToBe = tipoIa === 'Fijo' ? (fixedNew > 0 ? fixedNew : tarifa) : (vol * tIa * tarifa) + fixedNew;

  const ahorroMensual = Math.max(0, costAsIs - costToBe);
  const ahorroAnual = ahorroMensual * 12;

  const devHours = selectedInitiative?.horasDesarrollo || 0;
  const itRate = selectedInitiative?.costoHoraIt || 0;
  const setupCost = selectedInitiative?.costoSetup || 0;
  const costDev = devHours * itRate;
  const inversionTotal = costDev + setupCost;

  const paybackMeses = ahorroMensual > 0 ? (inversionTotal / ahorroMensual).toFixed(1) : 'N/A';

  const costoComparisonData = [
    { name: 'Costo Actual (AS-IS)', costo: Math.round(costAsIs) },
    { name: 'Costo Propuesto (TO-BE)', costo: Math.round(costToBe) }
  ];

  const capexBreakdownData = [
    { name: 'Horas Desarrollo', valor: Math.round(costDev), color: '#3b82f6' },
    { name: 'Setup / Infra', valor: Math.round(setupCost), color: '#8b5cf6' }
  ].filter(d => d.valor > 0);

  // 12 months cumulative cash flow projection
  const cashFlowData = Array.from({ length: 13 }, (_, month) => {
    const cumulativeSavings = ahorroMensual * month;
    const netFlow = cumulativeSavings - inversionTotal;
    return {
      mes: month === 0 ? 'Mes 0 (Inversión)' : `Mes ${month}`,
      flujoNeto: Math.round(netFlow),
      ahorroAcumulado: Math.round(cumulativeSavings)
    };
  });

  // Aggregate data for status
  const statusCounts = {
    Pendiente: 0,
    "En proceso": 0,
    Ejecutado: 0,
    Revisado: 0,
    Desestimado: 0
  };

  initiatives.forEach(init => {
    const prog = getProgress(init);
    const status = init.status === "Desestimado" ? "Desestimado" : getAutomaticStatus(prog);
    if (statusCounts[status as keyof typeof statusCounts] !== undefined) {
      statusCounts[status as keyof typeof statusCounts]++;
    }
  });

  const pieData = Object.entries(statusCounts)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      name: status,
      value: count,
      color: COLORS[status]
    }));

  const barData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status,
    cantidad: count
  }));

  const areaCounts: Record<string, number> = {};
  initiatives.forEach(init => {
    const area = (init.area && init.area.trim() !== "") ? init.area.trim() : "Sin Asignar";
    if (!areaCounts[area]) areaCounts[area] = 0;
    areaCounts[area]++;
  });

  const uniqueAreaKeys = Object.keys(areaCounts);

  const availableYears = new Set<number>([2026, new Date().getFullYear()]);
  initiatives.forEach(i => {
    if (i.status === 'Desestimado') return;
    if (i.startDate) availableYears.add(new Date(i.startDate + "T00:00:00").getFullYear());
    if (i.endDate) availableYears.add(new Date(i.endDate + "T00:00:00").getFullYear());
  });
  const yearOptions = Array.from(availableYears).sort((a, b) => a - b);
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  let minDate = new Date(selectedYear, startMonth, 1);
  let maxDate = new Date(selectedYear, endMonth + 1, 0); // Last day of endMonth

  const periods = [];
  const curr = new Date(minDate);

  if (timeGroupBy === 'Año') {
    let dataMinYear = selectedYear;
    let dataMaxYear = selectedYear;
    initiatives.forEach(i => {
      if (i.status === 'Desestimado') return;
      if (i.startDate) {
         const y = new Date(i.startDate + "T00:00:00").getFullYear();
         if (y < dataMinYear) dataMinYear = y;
      }
      if (i.endDate) {
         const y = new Date(i.endDate + "T00:00:00").getFullYear();
         if (y > dataMaxYear) dataMaxYear = y;
      }
    });
    
    let currYear = dataMinYear;
    while (currYear <= dataMaxYear) {
      periods.push({
        label: currYear.toString(),
        value: `${currYear}-12-31`
      });
      currYear++;
    }
  } else if (timeGroupBy === 'Mes') {
    curr.setDate(1);
    while (curr <= maxDate) {
      periods.push({
        label: `${monthNames[curr.getMonth()]} ${curr.getFullYear().toString().substring(2)}`,
        value: `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-28`
      });
      curr.setMonth(curr.getMonth() + 1);
    }
  } else if (timeGroupBy === 'Semana') {
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
    curr.setDate(diff);
    let weekNum = 1;
    let currentMonth = curr.getMonth();
    
    while (curr <= maxDate) {
      if (curr.getMonth() !== currentMonth) {
         currentMonth = curr.getMonth();
         weekNum = 1;
      }
      
      const label = `Sem ${weekNum} ${monthNames[currentMonth]}`;
      periods.push({
        label,
        value: `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`
      });
      curr.setDate(curr.getDate() + 7);
      weekNum++;
    }
  }

  const timeSeriesData = periods.map(m => {
    const dateStr = m.value;
    const point: Record<string, any> = {
      date: m.label
    };

    if (selectedAreaFilter === 'Todos') {
      uniqueAreaKeys.forEach(area => {
        const areaInits = initiatives.filter(i => (i.area?.trim() || 'Sin Asignar') === area && i.status !== 'Desestimado');
        let totalProg = 0;
        let count = 0;
        areaInits.forEach(i => {
          const startValid = !i.startDate || i.startDate <= dateStr;
          const endValid = !i.endDate || i.endDate >= dateStr;
          if (startValid && endValid) {
            totalProg += getHistoricalProgress(i, dateStr);
            count++;
          }
        });
        point[area] = count > 0 ? Math.round(totalProg / count) : 0;
      });
    } else {
      const areaInits = initiatives.filter(i => (i.area?.trim() || 'Sin Asignar') === selectedAreaFilter && i.status !== 'Desestimado');
      areaInits.forEach((init, idx) => {
        const key = init.name ? (init.name.length > 20 ? init.name.substring(0, 20) + '...' : init.name) : `Iniciativa ${idx + 1}`;
        const startValid = !init.startDate || init.startDate <= dateStr;
        const endValid = !init.endDate || init.endDate >= dateStr;
        point[key] = (startValid && endValid) ? getHistoricalProgress(init, dateStr) : 0;
        point[`${key}_full`] = init.name || `Iniciativa ${idx + 1}`;
      });
    }

    return point;
  });

  const handleChartClick = (data: any) => {
    if (!data || !data.activeLabel) return;
    const clickedLabel = data.activeLabel;
    
    if (timeGroupBy === 'Mes') {
       const monthPrefix = clickedLabel.split(' ')[0];
       const monthIdx = monthNames.indexOf(monthPrefix);
       if (monthIdx !== -1) {
          setStartMonth(monthIdx);
          setEndMonth(monthIdx);
          setTimeGroupBy('Semana');
       }
    } else if (timeGroupBy === 'Año') {
       const year = parseInt(clickedLabel);
       if (!isNaN(year)) {
          setSelectedYear(year);
          setStartMonth(0);
          setEndMonth(11);
          setTimeGroupBy('Mes');
       }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 p-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            title="Volver a Iniciativas"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <BarChartIcon size={24} className="text-purple-600" />
              Dashboard de Iniciativas & Análisis Financiero
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Vista general y métricas de ROI (AS-IS vs TO-BE)
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pie Chart Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center">
          <h2 className="text-lg font-bold text-gray-800 mb-4 w-full text-left">Distribución por Estado</h2>
          {pieData.length > 0 ? (
            <div className="w-full h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} iniciativas`, 'Cantidad']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              No hay datos para mostrar
            </div>
          )}
        </div>

        {/* Bar Chart Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center">
          <h2 className="text-lg font-bold text-gray-800 mb-4 w-full text-left">Resumen General</h2>
          <div className="w-full h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Time-Series Area Chart Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center lg:col-span-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full mb-6 gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {selectedAreaFilter === 'Todos' ? 'Progreso de Fases por Área en el Tiempo' : `Progreso de Iniciativas - ${selectedAreaFilter}`}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedAreaFilter === 'Todos' ? 'Cada línea representa una área de la iniciativa' : 'Basado en las fechas de inicio y fin del Plan de Trabajo'}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-600">Área:</span>
                <select
                  value={selectedAreaFilter}
                  onChange={(e) => setSelectedAreaFilter(e.target.value)}
                  className="border border-gray-300 bg-white rounded-md px-2 py-1.5 text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-sm"
                >
                  <option value="Todos">Todos</option>
                  {uniqueAreaKeys.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-600">Año:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                     setSelectedYear(Number(e.target.value));
                     setStartMonth(0);
                     setEndMonth(11);
                     setTimeGroupBy('Mes');
                  }}
                  className="border border-gray-300 bg-white rounded-md px-2 py-1.5 text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-sm"
                >
                  {yearOptions.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-gray-600">Meses:</span>
                <select
                  value={startMonth}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setStartMonth(val);
                    if (val > endMonth) setEndMonth(val);
                    setTimeGroupBy(val !== 0 || endMonth !== 11 ? 'Semana' : 'Mes');
                  }}
                  className="border border-gray-300 bg-white rounded-md px-2 py-1.5 text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-sm"
                >
                  {monthNames.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>
                <span className="text-xs font-semibold text-gray-500">-</span>
                <select
                  value={endMonth}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setEndMonth(val);
                    if (val < startMonth) setStartMonth(val);
                    setTimeGroupBy(startMonth !== 0 || val !== 11 ? 'Semana' : 'Mes');
                  }}
                  className="border border-gray-300 bg-white rounded-md px-2 py-1.5 text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-sm"
                >
                  {monthNames.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-600">Periodo:</span>
                <select
                  value={timeGroupBy}
                  onChange={(e) => setTimeGroupBy(e.target.value as 'Año' | 'Mes' | 'Semana')}
                  className="border border-gray-300 bg-white rounded-md px-2 py-1.5 text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-sm"
                >
                  <option value="Semana">Semana</option>
                  <option value="Mes">Mes</option>
                  <option value="Año">Año</option>
                </select>
              </div>
            </div>
          </div>

          <div className="w-full h-[400px]">
            {timeSeriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={timeSeriesData} 
                  margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                  onClick={handleChartClick}
                  style={{ cursor: timeGroupBy !== 'Semana' ? 'pointer' : 'default' }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} unit="%" axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  
                  {selectedAreaFilter === 'Todos' ? (
                    uniqueAreaKeys.map((area, idx) => (
                      <Line
                        key={area}
                        type="monotone"
                        dataKey={area}
                        name={area}
                        stroke={AREA_COLORS[idx % AREA_COLORS.length]}
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    ))
                  ) : (
                    initiatives
                      .filter(i => (i.area?.trim() || 'Sin Asignar') === selectedAreaFilter)
                      .map((init, idx) => {
                        const key = init.name ? (init.name.length > 20 ? init.name.substring(0, 20) + '...' : init.name) : `Iniciativa ${idx + 1}`;
                        return (
                          <Line
                            key={init.id}
                            type="monotone"
                            dataKey={key}
                            name={key}
                            stroke={AREA_COLORS[idx % AREA_COLORS.length]}
                            strokeWidth={2.5}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        );
                      })
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500">
                No hay datos temporales para mostrar
              </div>
            )}
          </div>
        </div>

        {/* FINANCIAL ROI & AS-IS vs TO-BE CHARTS SECTION */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:col-span-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full mb-6 gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp size={22} className="text-indigo-600" />
                Análisis Financiero y ROI (AS-IS vs TO-BE)
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Filtre primero por Grupo (Área) y posteriormente seleccione la iniciativa para visualizar sus indicadores financieros.
              </p>
            </div>

            {/* TWO-TIER FILTERS: Group -> Initiative */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Grupo:</span>
                <select
                  value={selectedFinancialGroup}
                  onChange={(e) => setSelectedFinancialGroup(e.target.value)}
                  className="border border-gray-300 bg-white rounded-md px-3 py-1.5 text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                >
                  <option value="Todos">Todos</option>
                  {uniqueAreas.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Iniciativa:</span>
                <select
                  value={selectedFinancialInitId}
                  onChange={(e) => setSelectedFinancialInitId(e.target.value)}
                  className="border border-gray-300 bg-white rounded-md px-3 py-1.5 text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm max-w-[280px]"
                >
                  {groupFilteredInitiatives.length > 0 ? (
                    groupFilteredInitiatives.map(init => (
                      <option key={init.id} value={init.id}>{init.name || 'Sin Nombre'}</option>
                    ))
                  ) : (
                    <option value="">No hay iniciativas</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {selectedInitiative ? (
            <div className="space-y-6">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Ahorro Neto Mensual</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">${ahorroMensual.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Anual: ${ahorroAnual.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
                    <DollarSign size={24} />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Inversión Total (Capex)</p>
                    <p className="text-2xl font-bold text-indigo-600 mt-1">${inversionTotal.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Desarrollo + Setup</p>
                  </div>
                  <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
                    <TrendingUp size={24} />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Periodo Recuperación</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{paybackMeses} meses</p>
                    <p className="text-xs text-slate-400 mt-0.5">Payback estimado</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                    <Clock size={24} />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Tipo Solución IA</p>
                    <p className="text-xl font-bold text-purple-600 mt-1">{tipoIa}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Modelo de Costos</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
                    <ShieldCheck size={24} />
                  </div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Cost Comparison (AS-IS vs TO-BE) */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-base font-bold text-gray-800 mb-2">Comparativo Costo Mensual (AS-IS vs TO-BE)</h3>
                  <p className="text-xs text-gray-500 mb-4">Gasto mensual operativo actual frente a la propuesta con IA.</p>
                  <div className="w-full h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={costoComparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <YAxis unit="$" axisLine={false} tickLine={false} />
                        <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Costo Mensual']} />
                        <Bar dataKey="costo" fill="#6366f1" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Cash Flow / Payback Projection */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-base font-bold text-gray-800 mb-2">Proyección de Flujo Neto (12 Meses)</h3>
                  <p className="text-xs text-gray-500 mb-4">Recuperación acumulada de la inversión inicial en el tiempo.</p>
                  <div className="w-full h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cashFlowData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <YAxis unit="$" axisLine={false} tickLine={false} />
                        <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Flujo Neto']} />
                        <Line type="monotone" dataKey="flujoNeto" name="Flujo Neto ($)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              Seleccione un grupo y una iniciativa para ver el análisis financiero detallado.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

