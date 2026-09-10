const generateTimePeriods = (groupBy, minD, maxD) => {
  const periods = [];
  const curr = new Date(minD);

  if (groupBy === 'Año') {
    curr.setMonth(0, 1);
    while (curr <= maxD) {
      const year = curr.getFullYear();
      periods.push({
        label: year.toString(),
        value: `${year}-01-01`
      });
      curr.setFullYear(curr.getFullYear() + 1);
    }
  } else if (groupBy === 'Mes') {
    curr.setDate(1);
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    while (curr <= maxD) {
      periods.push({
        label: `${monthNames[curr.getMonth()]} ${curr.getFullYear().toString().substring(2)}`,
        value: `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-01`
      });
      curr.setMonth(curr.getMonth() + 1);
    }
  } else if (groupBy === 'Semana') {
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
    curr.setDate(diff);
    let weekNum = 1;
    let currentYear = curr.getFullYear();
    
    while (curr <= maxD) {
      if (curr.getFullYear() !== currentYear) {
         currentYear = curr.getFullYear();
         weekNum = 1;
      }
      
      const label = `Sem ${weekNum} '${currentYear.toString().substring(2)}`;
      periods.push({
        label,
        value: `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`
      });
      curr.setDate(curr.getDate() + 7);
      weekNum++;
    }
  }
  return periods;
};

console.log(generateTimePeriods('Año', new Date('2025-05-15T00:00:00Z'), new Date('2027-02-10T00:00:00Z')));
console.log(generateTimePeriods('Mes', new Date('2026-10-15T00:00:00Z'), new Date('2027-02-10T00:00:00Z')));
console.log(generateTimePeriods('Semana', new Date('2026-12-15T00:00:00Z'), new Date('2027-01-15T00:00:00Z')));

