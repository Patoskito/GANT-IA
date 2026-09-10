sed -i 's/Archive, RotateCcw, GanttChart } from "lucide-react";/Archive, RotateCcw, GanttChart, LayoutDashboard } from "lucide-react";/' src/components/MainView.tsx
sed -i 's/onLogout\?: () => void;/onLogout?: () => void;\n  onOpenDashboard?: () => void;/' src/components/MainView.tsx
sed -i 's/  onLogout,/  onLogout,\n  onOpenDashboard,/' src/components/MainView.tsx
