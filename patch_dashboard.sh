sed -i "s/const areaInits = initiatives.filter(i => (i.area?.trim() || 'Sin Asignar') === area);/const areaInits = initiatives.filter(i => (i.area?.trim() || 'Sin Asignar') === area \&\& i.status !== 'Desestimado');/" src/components/DashboardView.tsx

sed -i "s/const areaInits = initiatives.filter(i => (i.area?.trim() || 'Sin Asignar') === selectedAreaFilter);/const areaInits = initiatives.filter(i => (i.area?.trim() || 'Sin Asignar') === selectedAreaFilter \&\& i.status !== 'Desestimado');/" src/components/DashboardView.tsx

