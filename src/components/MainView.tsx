import React, { useState, useRef, useEffect } from "react";
import { Plus, ArrowRight, ArrowLeft, Trash2, Archive, RotateCcw, GanttChart, LayoutDashboard, Settings, Search, Calendar, Sparkles, LogOut, ChevronDown, ChevronRight, PauseCircle, Lock, Play, Pause, AlertTriangle, Camera, Upload, User } from "lucide-react";
import { Initiative, PauseRecord } from "../types";
import { getEmptyPhases, getDefaultPhases, distributePhaseDates, calculateEndDateFromStart, parseDateSafe, formatDateSafe } from "../data";
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, updateDoc, doc, addDoc, onSnapshot } from 'firebase/firestore';
import { hasUserLoggedInToday, isUserRecentlyActive, formatConnectionTimestamp, isUserActuallyOnline } from '../utils/presence';
import TraceabilityCell from "./TraceabilityCell";

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
    case "En pausa":
      return "bg-amber-100 text-amber-800 border border-amber-300";
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
    case "En pausa":
      return "bg-amber-500";
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
  onUpdate: (id: string, field: keyof Initiative | Partial<Initiative>, value?: any) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  userProfile?: { name: string; email: string; role?: string } | null;
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
  const isAdmin = userProfile?.email === 'kayme@flesan.com.pe' || userProfile?.role === 'Administrador';
  
  // Persistencia de filtros en localStorage para que no se reinicien al navegar
  const FILTERS_STORAGE_KEY = 'iniciativas_mainview_filters';
  const savedFilters = React.useMemo(() => {
    try {
      const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Error reading saved filters:', e);
    }
    return null;
  }, []);

  const [filterPriority, setFilterPriority] = useState<string>(() => (savedFilters?.filterPriority !== undefined ? savedFilters.filterPriority : "Todas"));
  const [filterResponsable, setFilterResponsable] = useState<string>(() => savedFilters?.filterResponsable || "Todos");
  const [filterStatus, setFilterStatus] = useState<string>(() => savedFilters?.filterStatus || "Todos");
  const [searchQuery, setSearchQuery] = useState<string>(() => savedFilters?.searchQuery || "");
  const [dateFilterStart, setDateFilterStart] = useState<string>(() => savedFilters?.dateFilterStart || "");
  const [dateFilterEnd, setDateFilterEnd] = useState<string>(() => savedFilters?.dateFilterEnd || "");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState<boolean>(() => Boolean(savedFilters?.showArchived));
  const [showPaused, setShowPaused] = useState<boolean>(() => Boolean(savedFilters?.showPaused));

  // Guardar filtros automáticamente ante cualquier cambio
  useEffect(() => {
    try {
      localStorage.setItem(
        FILTERS_STORAGE_KEY,
        JSON.stringify({
          filterPriority,
          filterResponsable,
          filterStatus,
          searchQuery,
          dateFilterStart,
          dateFilterEnd,
          showArchived,
          showPaused,
        })
      );
    } catch (e) {
      console.error('Error saving filters:', e);
    }
  }, [filterPriority, filterResponsable, filterStatus, searchQuery, dateFilterStart, dateFilterEnd, showArchived, showPaused]);

  // Profile dropdown & avatar photo state
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Avatar photo state - load from localStorage first for instantaneous display
  const [userAvatar, setUserAvatar] = useState<string | null>(() => {
    if (userProfile?.email) {
      return localStorage.getItem(`user_avatar_${userProfile.email.trim()}`) || null;
    }
    return null;
  });

  // Sync avatar with Firestore on mount or user change
  useEffect(() => {
    if (!userProfile?.email) return;
    const emailKey = userProfile.email.trim();
    const local = localStorage.getItem(`user_avatar_${emailKey}`);
    if (local) {
      setUserAvatar(local);
    } else {
      getDocs(query(collection(db, 'users'), where('email', '==', emailKey)))
        .then((snap) => {
          if (!snap.empty) {
            const data = snap.docs[0].data();
            if (data.photoURL) {
              setUserAvatar(data.photoURL);
              localStorage.setItem(`user_avatar_${emailKey}`, data.photoURL);
            }
          }
        })
        .catch((e) => console.error("Error fetching user avatar from Firestore:", e));
    }
  }, [userProfile?.email]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!isProfileDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileDropdownOpen]);

  // Upload and resize profile photo
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG o WebP).');
      return;
    }

    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          saveAvatar(dataUrl);
        }
        setIsUploadingPhoto(false);
      };
      img.onerror = () => setIsUploadingPhoto(false);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => setIsUploadingPhoto(false);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const saveAvatar = async (dataUrl: string) => {
    setUserAvatar(dataUrl);
    if (!userProfile?.email) return;
    const emailKey = userProfile.email.trim();
    try {
      localStorage.setItem(`user_avatar_${emailKey}`, dataUrl);
    } catch (err) {
      console.error('Error saving avatar to localStorage:', err);
    }

    try {
      const q = query(collection(db, 'users'), where('email', '==', emailKey));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'users', userDoc.id), { photoURL: dataUrl });
      } else {
        await addDoc(collection(db, 'users'), {
          name: userProfile.name || emailKey.split('@')[0],
          email: emailKey,
          role: userProfile.role || 'Usuario',
          photoURL: dataUrl,
        });
      }
    } catch (err) {
      console.error('Error saving avatar to Firestore:', err);
    }
  };

  const removeAvatar = async () => {
    setUserAvatar(null);
    if (!userProfile?.email) return;
    const emailKey = userProfile.email.trim();
    try {
      localStorage.removeItem(`user_avatar_${emailKey}`);
    } catch (err) {
      console.error('Error removing avatar from localStorage:', err);
    }

    try {
      const q = query(collection(db, 'users'), where('email', '==', emailKey));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'users', userDoc.id), { photoURL: '' });
      }
    } catch (err) {
      console.error('Error removing avatar from Firestore:', err);
    }
  };

  // Two initials from email e.g. "kayme@flesan.com.pe" -> "KA"
  const userInitials = (userProfile?.email ? userProfile.email.slice(0, 2) : "US").toUpperCase();

  const [pauseModalInitId, setPauseModalInitId] = useState<string | null>(null);
  const [pauseReasonInput, setPauseReasonInput] = useState("");
  const [resumeModalInit, setResumeModalInit] = useState<Initiative | null>(null);
  const [resumeCommentInput, setResumeCommentInput] = useState("");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newInitName, setNewInitName] = useState("");
  const [newInitArea, setNewInitArea] = useState("");
  const [newInitResponsible, setNewInitResponsible] = useState("");
  const [newInitResponsible2, setNewInitResponsible2] = useState("");
  const [newInitPriority, setNewInitPriority] = useState<string>("Alta");
  const [incompleteModalInit, setIncompleteModalInit] = useState<Initiative | null>(null);

  interface LiveUser {
    id: string;
    name: string;
    email: string;
    role?: string;
    photoURL?: string;
    lastLoginAt?: string;
    lastActiveAt?: string;
    lastLogoutAt?: string;
    logoutReason?: string;
    isOnline?: boolean;
  }
  const [allUsersList, setAllUsersList] = useState<LiveUser[]>([]);
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
    
    // Suscripción en tiempo real a los usuarios para detectar actividad y conexiones
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users: LiveUser[] = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || '',
        email: doc.data().email || '',
        role: doc.data().role || 'Usuario',
        photoURL: doc.data().photoURL || '',
        lastLoginAt: doc.data().lastLoginAt || '',
        lastActiveAt: doc.data().lastActiveAt || '',
        lastLogoutAt: doc.data().lastLogoutAt || '',
        logoutReason: doc.data().logoutReason || '',
        isOnline: Boolean(doc.data().isOnline),
      }));
      setAllUsersList(users);

      const uniqueNames = Array.from(new Set(users.map(u => u.name).filter(Boolean))).sort();
      setRegisteredUsers(uniqueNames);
    }, (error) => {
      console.error("Error listening to users in MainView:", error);
    });

    return () => {
      unsubscribeUsers();
    };
  }, []);

  // Filtrar exclusivamente a OTROS usuarios que están conectados en este momento (sin duplicar el propio perfil)
  const activeOrLoggedInOtherUsers = React.useMemo(() => {
    const currentEmail = userProfile?.email?.trim().toLowerCase();
    const currentName = userProfile?.name?.trim().toLowerCase();

    // Filtrar únicamente a otros usuarios que están actualmente en línea
    const otherActive = allUsersList.filter(u => {
      const uEmail = u.email?.trim().toLowerCase();
      const uName = u.name?.trim().toLowerCase();
      // Excluir al usuario actual por correo y por nombre para jamás duplicar su propio perfil
      if (!uEmail) return false;
      if (currentEmail && uEmail === currentEmail) return false;
      if (currentName && uName === currentName) return false;

      // Debe estar genuinamente en línea (no haber cerrado sesión y con latido activo en los últimos 15 min)
      return isUserActuallyOnline(u, 15);
    });

    return otherActive.sort((a, b) => {
      const timeA = new Date(a.lastActiveAt || a.lastLoginAt || 0).getTime();
      const timeB = new Date(b.lastActiveAt || b.lastLoginAt || 0).getTime();
      return timeB - timeA;
    });
  }, [allUsersList, userProfile]);

  const userName = userProfile?.name || "";
  
  const responsablesList = [...registeredUsers];

  const responsablesFiltro = ["Todos", ...responsablesList];
  
  const selectResponsableOptions = responsablesList;

  const allAvailableAreas = Array.from(
    new Set([
      ...availableAreas,
      ...initiatives.map((i) => i.area).filter(Boolean),
    ])
  ) as string[];

  const allAvailableResponsibles = Array.from(
    new Set([
      ...selectResponsableOptions,
      ...initiatives.map((i) => i.responsible).filter(Boolean),
      userName,
    ].filter(Boolean))
  ) as string[];

  const isInitiativeComplete = (init: Initiative): boolean => {
    const hasName = Boolean(
      init.name &&
      init.name.trim() !== "" &&
      init.name.trim() !== "Nueva Iniciativa"
    );
    const hasArea = Boolean(init.area && init.area.trim() !== "");
    const hasResp = Boolean(init.responsible && init.responsible.trim() !== "");
    return hasName && hasArea && hasResp;
  };

  const handleOpenNewModal = () => {
    setNewInitName("");
    setNewInitArea("");
    setNewInitResponsible("");
    setNewInitResponsible2("");
    setNewInitPriority("Alta");
    setIsNewModalOpen(true);
  };

  const handleCreateInitiativeFromModal = () => {
    if (!newInitName.trim() || !newInitArea.trim() || !newInitResponsible.trim()) {
      return;
    }
    const newInit: Initiative = {
      id: `init-${Date.now()}`,
      name: newInitName.trim(),
      area: newInitArea.trim(),
      responsible: newInitResponsible.trim(),
      responsible2: newInitResponsible2.trim(),
      priority: newInitPriority || "Alta",
      startDate: "",
      endDate: "",
      phases: getDefaultPhases(),
    };
    onAdd(newInit);
    setIsNewModalOpen(false);
    setNewInitName("");
    setNewInitArea("");
    setNewInitResponsible("");
    setNewInitResponsible2("");
    setNewInitPriority("Alta");
  };

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
    handleOpenNewModal();
  };

  const updateInitiative = (
    id: string,
    field: keyof Initiative,
    value: string,
  ) => {
    onUpdate(id, field, value);
  };

  const handleStartDateChange = (id: string, newStartDate: string) => {
    const init = initiatives.find((i) => i.id === id);
    if (!init) return;

    if (!isInitiativeComplete(init)) {
      setIncompleteModalInit(init);
      return;
    }

    if (newStartDate) {
      const calculatedEnd = calculateEndDateFromStart(newStartDate, 9);
      const updatedPhases = distributePhaseDates(init?.phases, newStartDate);

      onUpdate(id, {
        startDate: newStartDate,
        endDate: calculatedEnd,
        phases: updatedPhases,
      });
      return;
    }
    onUpdate(id, "startDate", newStartDate);
  };

  const handleConfirmPause = () => {
    if (!pauseModalInitId || !pauseReasonInput.trim()) return;
    const init = initiatives.find((i) => i.id === pauseModalInitId);
    if (!init) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const currentUserName = userProfile?.name || userProfile?.email || "Usuario";
    const newPauseEntry: PauseRecord = {
      id: `pause-${Date.now()}`,
      pausedAt: todayStr,
      pausedBy: currentUserName,
      reason: pauseReasonInput.trim(),
    };

    onUpdate(init.id, {
      status: "En pausa",
      pausedAt: todayStr,
      pausedBy: currentUserName,
      pauseReason: pauseReasonInput.trim(),
      pauseHistory: [...(init.pauseHistory || []), newPauseEntry],
    });

    setPauseModalInitId(null);
    setPauseReasonInput("");
  };

  const handleResumeInitiative = (init: Initiative) => {
    setResumeModalInit(init);
    setResumeCommentInput("");
  };

  const handleConfirmResume = () => {
    if (!resumeModalInit) return;
    const init = resumeModalInit;
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    let daysPaused = 0;
    if (init.pausedAt) {
      const pDate = new Date(init.pausedAt + "T12:00:00");
      if (!isNaN(pDate.getTime())) {
        daysPaused = Math.max(0, Math.round((today.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24)));
      }
    }

    // Shift endDate forward by daysPaused
    let updatedEndDate = init.endDate;
    if (daysPaused > 0 && init.endDate) {
      const endD = new Date(init.endDate + "T12:00:00");
      if (!isNaN(endD.getTime())) {
        endD.setDate(endD.getDate() + daysPaused);
        const yyyy = endD.getFullYear();
        const mm = String(endD.getMonth() + 1).padStart(2, "0");
        const dd = String(endD.getDate()).padStart(2, "0");
        updatedEndDate = `${yyyy}-${mm}-${dd}`;
      }
    }

    const currentUserName = userProfile?.name || userProfile?.email || "Usuario";
    const history = [...(init.pauseHistory || [])];
    
    // Find active entry (without resumedAt) or the last entry
    let targetIndex = -1;
    for (let i = history.length - 1; i >= 0; i--) {
      if (!history[i].resumedAt) {
        targetIndex = i;
        break;
      }
    }
    if (targetIndex === -1 && history.length > 0) {
      targetIndex = history.length - 1;
    }

    if (targetIndex >= 0) {
      history[targetIndex] = {
        ...history[targetIndex],
        resumedAt: todayStr,
        resumedBy: currentUserName,
        daysPaused,
        resumeComment: resumeCommentInput.trim() || "",
      };
    } else {
      history.push({
        id: `pause-${Date.now()}`,
        pausedAt: init.pausedAt || todayStr,
        pausedBy: init.pausedBy || currentUserName,
        reason: init.pauseReason || "Pausa",
        resumedAt: todayStr,
        resumedBy: currentUserName,
        daysPaused,
        resumeComment: resumeCommentInput.trim() || "",
      });
    }

    // Shift unfinished tasks in phases forward by daysPaused to preserve schedule alignment
    let updatedPhases = init.phases;
    if (daysPaused > 0 && init.phases && init.phases.length > 0) {
      updatedPhases = init.phases.map(p => ({
        ...p,
        tasks: p.tasks.map(t => {
          if (t.progress < 100) {
            const shiftDateStr = (dateStr: string) => {
              if (!dateStr) return dateStr;
              const d = parseDateSafe(dateStr);
              if (!d) return dateStr;
              d.setDate(d.getDate() + daysPaused);
              return formatDateSafe(d);
            };
            return {
              ...t,
              start: shiftDateStr(t.start),
              end: shiftDateStr(t.end),
            };
          }
          return t;
        })
      }));
    }

    onUpdate(init.id, {
      status: "",
      pausedAt: "",
      pauseReason: "",
      pausedBy: "",
      pauseHistory: history,
      endDate: updatedEndDate,
      phases: updatedPhases,
    });

    setResumeModalInit(null);
    setResumeCommentInput("");
  };

  const filteredInitiatives = initiatives.filter((init) => {
    const isArchived = init.status === "Desestimado";
    const isPaused = init.status === "En pausa";

    if (showArchived && !isArchived) return false;
    if (!showArchived && isArchived) return false;

    if (showPaused && !isPaused) return false;

    if (filterPriority !== "Todas") {
      const initPriority = init.priority || "Alta";
      if (initPriority.toLowerCase() !== filterPriority.toLowerCase()) return false;
    }

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
    const currentStatus =
      init.status === "Desestimado"
        ? "Desestimado"
        : init.status === "En pausa"
        ? "En pausa"
        : getAutomaticStatus(prog);
    
    if (filterStatus !== "Todos" && currentStatus !== filterStatus) return false;

    return true;
  }).sort((a, b) => {
    const statusOrder: { [key: string]: number } = {
      "Pendiente": 1,
      "En proceso": 2,
      "En pausa": 3,
      "Ejecutado": 4,
      "Revisado": 5,
      "Desestimado": 6,
    };
    const progA = getProgress(a);
    const progB = getProgress(b);
    const statusA =
      a.status === "Desestimado"
        ? "Desestimado"
        : a.status === "En pausa"
        ? "En pausa"
        : getAutomaticStatus(progA);
    const statusB =
      b.status === "Desestimado"
        ? "Desestimado"
        : b.status === "En pausa"
        ? "En pausa"
        : getAutomaticStatus(progB);
    
    const rankA = statusOrder[statusA] || 99;
    const rankB = statusOrder[statusB] || 99;
    return rankA - rankB;
  });

  const stats = {
    total: 0,
    pendiente: 0,
    enProceso: 0,
    enPausa: 0,
    ejecutado: 0,
    revisado: 0,
    desestimado: 0,
  };

  const priorityStats = {
    alta: 0,
    media: 0,
    baja: 0,
  };

  initiatives.forEach((init) => {
    const isArchived = init.status === "Desestimado";
    const isPaused = init.status === "En pausa";

    if (showArchived && !isArchived) return;
    if (!showArchived && isArchived) return;
    if (showPaused && !isPaused) return;

    if (filterResponsable !== "Todos") {
      if (!(init.responsible || "").toLowerCase().includes(filterResponsable.toLowerCase())) return;
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchTitle = init.name.toLowerCase().includes(q);
      const matchArea = (init.area || "").toLowerCase().includes(q);
      if (!matchTitle && !matchArea) return;
    }

    if (dateFilterStart) {
      if (!init.startDate || init.startDate < dateFilterStart) return;
    }

    if (dateFilterEnd) {
      if (!init.startDate || init.startDate > dateFilterEnd) return;
    }

    // For stats (respects filterPriority, but NOT filterStatus)
    let matchesPriority = true;
    if (filterPriority !== "Todas") {
      const initPriority = init.priority || "Alta";
      if (initPriority.toLowerCase() !== filterPriority.toLowerCase()) {
        matchesPriority = false;
      }
    }

    if (matchesPriority) {
      stats.total++;
      if (isArchived) {
        stats.desestimado++;
      } else if (isPaused) {
        stats.enPausa++;
      } else {
        const prog = getProgress(init);
        const status = getAutomaticStatus(prog);
        if (status === "Pendiente") stats.pendiente++;
        else if (status === "En proceso") stats.enProceso++;
        else if (status === "Ejecutado") stats.ejecutado++;
        else if (status === "Revisado") stats.revisado++;
      }
    }

    // For priorityStats (respects filterStatus, but NOT filterPriority)
    let matchesStatus = true;
    const prog = getProgress(init);
    const currentStatus =
      init.status === "Desestimado"
        ? "Desestimado"
        : init.status === "En pausa"
        ? "En pausa"
        : getAutomaticStatus(prog);
    if (filterStatus !== "Todos" && currentStatus !== filterStatus) {
      matchesStatus = false;
    }

    if (matchesStatus) {
      const prio = (init.priority || "Alta").toLowerCase();
      if (prio === "alta") priorityStats.alta++;
      else if (prio === "media") priorityStats.media++;
      else if (prio === "baja") priorityStats.baja++;
      else priorityStats.alta++;
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full text-slate-800">
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-xs w-full px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
          {/* Brand & Main Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <SyncedInput
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  title="Editar Título"
                  className="text-xl md:text-2xl font-bold text-gray-900 outline-none border-b border-transparent hover:border-gray-300 focus:border-blue-500 transition-colors bg-transparent"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                <span>Portafolio Estratégico</span>
                <span>•</span>
                <span className="text-blue-600 font-semibold">{initiatives.length} iniciativas</span>
              </div>
            </div>
          </div>

          {/* Navbar Actions & Profile */}
          <div className="flex items-center flex-wrap gap-2.5 sm:gap-3 w-full md:w-auto justify-between md:justify-end">
            {/* Logos de OTROS usuarios que están activos o que ingresaron (sin duplicar tu perfil actual) */}
            {activeOrLoggedInOtherUsers.length > 0 && (
              <div 
                className="flex items-center gap-1.5 bg-emerald-50/80 hover:bg-emerald-50 border border-emerald-200 py-1 px-2.5 rounded-full transition-colors shadow-2xs mr-1"
                title={`${activeOrLoggedInOtherUsers.length} otro(s) usuario(s) conectado(s) hoy`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="hidden sm:inline">En línea ({activeOrLoggedInOtherUsers.length}):</span>
                </div>
                <div className="flex items-center -space-x-2 overflow-visible">
                  {activeOrLoggedInOtherUsers.map((u) => {
                    const initials = (u.email ? u.email.slice(0, 2) : "US").toUpperCase();
                    const isRecent = isUserRecentlyActive(u.lastActiveAt);
                    const conn = formatConnectionTimestamp(u.lastActiveAt || u.lastLoginAt);

                    return (
                      <div
                        key={u.id || u.email}
                        className="relative group cursor-pointer"
                      >
                        {u.photoURL ? (
                          <img
                            src={u.photoURL}
                            alt={u.name || u.email}
                            className="w-7 h-7 rounded-full object-cover ring-2 ring-white border border-emerald-300 shadow-2xs transition-transform group-hover:scale-120 group-hover:z-20"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-black text-[10px] flex items-center justify-center ring-2 ring-white shadow-2xs transition-transform group-hover:scale-120 group-hover:z-20 uppercase">
                            {initials}
                          </div>
                        )}
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-1.5 ring-white ${
                          isRecent ? "bg-emerald-500 animate-pulse" : "bg-emerald-400"
                        }`} />

                        {/* Popover flotante al pasar el mouse por encima */}
                        <div className="hidden group-hover:flex flex-col absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1.5 bg-gray-900/95 backdrop-blur-xs text-white rounded-lg text-[10px] shadow-xl pointer-events-none z-50 whitespace-nowrap min-w-[130px]">
                          <span className="font-bold text-white truncate">{u.name || u.email.split('@')[0]}</span>
                          <span className="text-gray-300 text-[9px] truncate">{u.email}</span>
                          <div className="flex items-center gap-1 text-emerald-300 font-semibold text-[9px] mt-1 pt-1 border-t border-gray-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span>{isRecent ? "🟢 Conectado ahora" : `🕒 Ingreso: ${conn.badge}`}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {onOpenAgenda && (
              <button
                onClick={onOpenAgenda}
                className="p-2 rounded-lg border transition-colors bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100 flex items-center justify-center shadow-xs cursor-pointer"
                title="Agenda Semanal"
              >
                <Calendar size={18} />
              </button>
            )}

            {onOpenDashboard && (
              <button
                onClick={onOpenDashboard}
                className="p-2 rounded-lg border transition-colors bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 flex items-center justify-center shadow-xs cursor-pointer"
                title="Dashboard"
              >
                <LayoutDashboard size={18} />
              </button>
            )}

            {userProfile && (
              <div ref={profileDropdownRef} className="relative border-l border-gray-200 pl-2 sm:pl-3 ml-1">
                {/* Trigger: Solo las dos primeras letras del correo (ej. "KA") o la foto si ya la subió */}
                <button
                  type="button"
                  onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                    isProfileDropdownOpen
                      ? "ring-2 ring-blue-600 ring-offset-2 shadow-md"
                      : "ring-1 ring-gray-200 hover:ring-2 hover:ring-blue-400 hover:scale-105 shadow-2xs"
                  }`}
                  title={`${userProfile.name || userProfile.email} (Clic para ver opciones y foto)`}
                  aria-label="Menú de perfil"
                  aria-expanded={isProfileDropdownOpen}
                >
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={userProfile.name || "Foto de perfil"}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-full h-full rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center tracking-wider uppercase select-none">
                      {userInitials}
                    </span>
                  )}
                  {/* Micro indicador activo de usuario */}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </button>

                {/* Panel desplegable al dar clic en la inicial "KA" */}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2.5 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* Header del dropdown: Avatar con botón de cámara, Nombre completo, Gmail y Rol */}
                    <div className="p-4 bg-linear-to-b from-gray-50 to-white border-b border-gray-100 flex items-start gap-3">
                      <div className="relative shrink-0">
                        {userAvatar ? (
                          <img
                            src={userAvatar}
                            alt="Avatar"
                            className="w-13 h-13 rounded-full object-cover border-2 border-blue-500 shadow-xs"
                          />
                        ) : (
                          <div className="w-13 h-13 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-black text-base flex items-center justify-center tracking-wider shadow-xs uppercase select-none">
                            {userInitials}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute -bottom-1 -right-1 p-1 bg-white hover:bg-gray-100 rounded-full border border-gray-300 shadow-xs text-gray-700 cursor-pointer transition-transform hover:scale-110"
                          title="Cambiar foto de perfil"
                        >
                          <Camera size={12} className="text-blue-600" />
                        </button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-gray-900 truncate" title={userProfile.name}>
                          {userProfile.name || userProfile.email.split('@')[0]}
                        </h4>
                        <p className="text-xs text-gray-500 truncate mt-0.5" title={userProfile.email}>
                          {userProfile.email}
                        </p>
                        <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {userProfile.role || (isAdmin ? "Administrador" : "Usuario")}
                        </span>
                      </div>
                    </div>

                    {/* Sección interactiva para subir foto y reemplazar el "KA" */}
                    <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Upload size={13} className="text-blue-600" />
                        <span>
                          {isUploadingPhoto
                            ? "Procesando..."
                            : userAvatar
                            ? "Cambiar foto de perfil"
                            : "Subir foto para reemplazar iniciales"}
                        </span>
                      </button>
                      {userAvatar && (
                        <button
                          type="button"
                          onClick={removeAvatar}
                          className="w-full text-center text-[10px] text-gray-400 hover:text-red-600 transition-colors mt-1.5 cursor-pointer"
                        >
                          Quitar foto y volver a iniciales "{userInitials}"
                        </button>
                      )}
                    </div>

                    {/* Menú de opciones: Administración y Cerrar Sesión */}
                    <div className="p-2 space-y-1">
                      {onOpenAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            onOpenAdmin();
                          }}
                          className="w-full px-3 py-2 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-100 flex items-center justify-between transition-colors cursor-pointer group"
                        >
                          <span className="flex items-center gap-2.5">
                            <Settings size={15} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                            <span className="font-semibold text-gray-800">Administración</span>
                          </span>
                          <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-600 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      )}

                      {onLogout && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            onLogout();
                          }}
                          className="w-full px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 flex items-center justify-between transition-colors cursor-pointer group"
                        >
                          <span className="flex items-center gap-2.5">
                            <LogOut size={15} className="text-red-500 group-hover:text-red-600 transition-colors" />
                            <span className="font-semibold">Cerrar Sesión</span>
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Screen Body */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-4">
        {/* Search & Filter Toolbar */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center gap-3 w-full">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <SyncedInput
              type="text"
              placeholder="Buscar por título o área..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Desde:</span>
            <SyncedInput
              type="date"
              value={dateFilterStart}
              onChange={(e) => setDateFilterStart(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Hasta:</span>
            <SyncedInput
              type="date"
              value={dateFilterEnd}
              onChange={(e) => setDateFilterEnd(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white"
            />
          </div>

          {/* Filter Prioridad (antes de Todos los estados, por default en Todas) */}
          <div className="flex items-center bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-transparent border-none rounded-md px-1 py-0.5 text-xs outline-none focus:ring-0 text-gray-800 font-semibold cursor-pointer"
            >
              <option value="Todas">Todas las prioridades</option>
              <option value="Alta">Alta ({priorityStats.alta})</option>
              <option value="Media">Media ({priorityStats.media})</option>
              <option value="Baja">Baja ({priorityStats.baja})</option>
            </select>
          </div>

          {/* Filter Status (sin label "Estado:") */}
          <div className="flex items-center bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent border-none rounded-md px-1 py-0.5 text-xs outline-none focus:ring-0 text-gray-800 font-semibold cursor-pointer"
            >
              <option value="Todos">Todos los estados ({stats.total})</option>
              <option value="Pendiente">Pendientes ({stats.pendiente})</option>
              <option value="En proceso">En proceso ({stats.enProceso})</option>
              <option value="En pausa">En pausa ({stats.enPausa})</option>
              <option value="Ejecutado">Ejecutados ({stats.ejecutado})</option>
              <option value="Revisado">Revisados ({stats.revisado})</option>
              {showArchived && <option value="Desestimado">Desestimados ({stats.desestimado})</option>}
            </select>
          </div>

          {/* Filter Responsable (sin label "Responsable:") */}
          <div className="flex items-center bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200">
            <select
              value={filterResponsable}
              onChange={(e) => setFilterResponsable(e.target.value)}
              className="bg-transparent border-none rounded-md px-1 py-0.5 text-xs outline-none focus:ring-0 text-gray-800 font-semibold cursor-pointer"
            >
              {responsablesFiltro.map((r) => (
                <option key={r} value={r}>
                  {r === "Todos" ? "Todos los responsables" : r}
                </option>
              ))}
            </select>
          </div>

          {/* Restablecer filtros */}
          {(() => {
            const hasActiveFilters =
              filterPriority !== "Todas" ||
              filterResponsable !== "Todos" ||
              filterStatus !== "Todos" ||
              searchQuery.trim() !== "" ||
              dateFilterStart !== "" ||
              dateFilterEnd !== "" ||
              showArchived ||
              showPaused;

            return (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setDateFilterStart('');
                  setDateFilterEnd('');
                  setFilterPriority('Todas');
                  setFilterStatus('Todos');
                  setFilterResponsable('Todos');
                  setShowArchived(false);
                  setShowPaused(false);
                  try {
                    localStorage.removeItem(FILTERS_STORAGE_KEY);
                  } catch (e) {
                    console.error('Error clearing filters from storage:', e);
                  }
                }}
                className={`p-2 rounded-lg transition-colors cursor-pointer relative ${
                  hasActiveFilters 
                    ? "text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 shadow-2xs" 
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                }`}
                title={hasActiveFilters ? "Filtros activos — Clic para restablecer filtros" : "Restablecer filtros"}
              >
                <RotateCcw size={16} />
                {hasActiveFilters && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
                )}
              </button>
            );
          })()}

          {/* Grupo de botones de acción pegados a la derecha de la barra (iniciando de derecha a izquierda) */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {/* Pausadas */}
            <button
              onClick={() => {
                if (showPaused) {
                  setShowPaused(false);
                } else {
                  setShowPaused(true);
                  setShowArchived(false);
                }
              }}
              className={`p-2 rounded-lg border transition-colors flex items-center justify-center shadow-xs relative cursor-pointer ${
                showPaused
                  ? "bg-amber-100 text-amber-800 border-amber-300 ring-2 ring-amber-300"
                  : "bg-gray-50 text-gray-600 hover:text-amber-700 hover:bg-amber-50 border-gray-200 hover:border-amber-200"
              }`}
              title={showPaused ? "Mostrar todas las iniciativas" : "Ver iniciativas en pausa"}
            >
              <PauseCircle size={18} />
              {stats.enPausa > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-bold">
                  {stats.enPausa}
                </span>
              )}
            </button>

            {/* Desestimadas */}
            <button
              onClick={() => {
                setShowArchived((prev) => !prev);
                setShowPaused(false);
              }}
              className={`p-2 rounded-lg border transition-colors flex items-center justify-center shadow-xs relative cursor-pointer ${
                showArchived
                  ? "bg-red-50 text-red-600 border-red-300 ring-2 ring-red-200"
                  : "bg-gray-50 text-gray-600 hover:text-red-600 hover:bg-red-50 border-gray-200 hover:border-red-200"
              }`}
              title={showArchived ? "Mostrar iniciativas activas" : "Ver iniciativas desestimadas"}
            >
              <Archive size={18} />
              {stats.desestimado > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-bold">
                  {stats.desestimado}
                </span>
              )}
            </button>

            {/* Nueva Iniciativa (al extremo derecho) */}
            <button
              onClick={addInitiative}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center shadow-xs cursor-pointer"
              title="Nueva Iniciativa"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Full-width Initiatives Table Container */}
        <div className="bg-white border border-gray-200 shadow-xs rounded-xl overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse table-auto">
            <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 border-b border-gray-200 min-w-[250px] w-[26%]">
                  Descripción Iniciativa
                </th>
                <th className="px-3 py-3 border-b border-gray-200 min-w-[150px] w-[14%]">
                  Área Iniciativa
                </th>
                <th className="px-3 py-3 border-b border-gray-200 min-w-[130px] w-[12%]">
                  Responsable 1
                </th>
                <th className="px-3 py-3 border-b border-gray-200 min-w-[130px] w-[12%]">
                  Responsable 2
                </th>
                <th className="px-2 py-3 border-b border-gray-200 text-center min-w-[105px] w-[105px]">
                  Prioridad
                </th>
                <th className="px-2 py-3 border-b border-gray-200 text-center min-w-[95px] w-[95px]">
                  Progreso (%)
                </th>
                <th className="px-2 py-3 border-b border-gray-200 text-center min-w-[110px] w-[110px]">
                  Estado
                </th>
                <th className="px-2 py-3 border-b border-gray-200 text-center min-w-[125px] w-[125px]">
                  Fecha Inicio
                </th>
                <th className="px-3 py-3 border-b border-gray-200 text-left min-w-[215px] w-[215px]">
                  Trazabilidad & Fase
                </th>
                <th className="px-2 py-3 border-b border-gray-200 text-center min-w-[125px] w-[125px]">
                  Fecha Fin
                </th>
                <th className="px-2 py-3 border-b border-gray-200 text-center min-w-[95px] w-[95px]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredInitiatives.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-gray-500">
                    {showArchived
                      ? "No hay iniciativas desestimadas."
                      : showPaused
                      ? "No hay iniciativas en pausa."
                      : "No hay iniciativas que coincidan con el filtro seleccionado."}
                  </td>
                </tr>
              ) : null}
              {filteredInitiatives.map((init) => {
                const isComplete = isInitiativeComplete(init);
                const avgProgress = getProgress(init);
                const currentStatus =
                  init.status === "Desestimado"
                    ? "Desestimado"
                    : init.status === "En pausa"
                    ? "En pausa"
                    : getAutomaticStatus(avgProgress);
                return (
                  <tr
                    key={init.id}
                    className="hover:bg-gray-50/80 transition-colors group"
                  >
                    <td className="px-2.5 py-2 border-b border-gray-200 align-top focus-within:bg-blue-50/40 transition-colors">
                      <AutoResizeTextarea
                        value={init.name}
                        onChange={(e) =>
                          updateInitiative(init.id, "name", e.target.value)
                        }
                        className={`w-full bg-transparent outline-none focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-1 text-xs font-medium leading-relaxed whitespace-normal break-words ${
                          !init.name?.trim() || init.name.trim() === "Nueva Iniciativa"
                            ? "text-amber-700 placeholder:text-amber-500"
                            : "text-gray-800"
                        }`}
                        placeholder="Descripción de la iniciativa (requerido)..."
                        minHeight={42}
                      />
                    </td>
                    <td className="px-2 py-2 border-b border-gray-200 align-middle">
                      <div className={`relative group/cell w-full min-h-[36px] flex items-center justify-between px-2 py-1 rounded-md hover:bg-gray-100/80 transition-colors border cursor-pointer ${
                        !init.area?.trim() ? "border-amber-300 bg-amber-50/40" : "border-transparent hover:border-gray-200"
                      }`}>
                        <span
                          className={`text-xs leading-snug break-words pr-1 line-clamp-2 ${
                            init.area ? "text-gray-800 font-medium" : "text-amber-700 italic font-semibold"
                          }`}
                          title={init.area || "Seleccionar área..."}
                        >
                          {init.area || "Seleccionar área *"}
                        </span>
                        <ChevronDown size={13} className="text-gray-400 shrink-0 group-hover/cell:text-gray-600" />
                        <select
                          value={init.area || ""}
                          onChange={(e) =>
                            updateInitiative(init.id, "area", e.target.value)
                          }
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          title={init.area || "Seleccionar área"}
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
                      </div>
                    </td>
                    <td className="px-2 py-2 border-b border-gray-200 align-middle">
                      <div className={`relative group/cell w-full min-h-[36px] flex items-center justify-between px-2 py-1 rounded-md hover:bg-gray-100/80 transition-colors border cursor-pointer ${
                        !init.responsible?.trim() ? "border-amber-300 bg-amber-50/40" : "border-transparent hover:border-gray-200"
                      }`}>
                        <span
                          className={`text-xs leading-snug break-words pr-1 line-clamp-2 ${
                            init.responsible ? "text-gray-700 font-medium" : "text-amber-700 italic font-semibold"
                          }`}
                          title={init.responsible || "Seleccionar responsable"}
                        >
                          {init.responsible || "Seleccionar responsable *"}
                        </span>
                        <ChevronDown size={13} className="text-gray-400 shrink-0 group-hover/cell:text-gray-600" />
                        <select
                          value={init.responsible || ""}
                          onChange={(e) =>
                            updateInitiative(
                              init.id,
                              "responsible",
                              e.target.value,
                            )
                          }
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          title={init.responsible || "Seleccionar responsable"}
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
                      </div>
                    </td>
                    <td className="px-2 py-2 border-b border-gray-200 align-middle">
                      <div className="relative group/cell w-full min-h-[36px] flex items-center justify-between px-2 py-1 rounded-md hover:bg-gray-100/80 transition-colors border border-transparent hover:border-gray-200 cursor-pointer">
                        <span
                          className={`text-xs leading-snug break-words pr-1 line-clamp-2 ${
                            init.responsible2 ? "text-gray-700 font-medium" : "text-gray-400 italic"
                          }`}
                          title={init.responsible2 || "Seleccionar responsable"}
                        >
                          {init.responsible2 || "Seleccionar..."}
                        </span>
                        <ChevronDown size={13} className="text-gray-400 shrink-0 group-hover/cell:text-gray-600" />
                        <select
                          value={init.responsible2 || ""}
                          onChange={(e) =>
                            updateInitiative(
                              init.id,
                              "responsible2",
                              e.target.value,
                            )
                          }
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          title={init.responsible2 || "Seleccionar responsable"}
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
                      </div>
                    </td>
                    <td className="px-2 py-2 border-b border-gray-200 text-center align-middle">
                      <div className="relative inline-block w-full max-w-[95px]">
                        <select
                          value={init.priority || 'Alta'}
                          onChange={(e) =>
                            updateInitiative(
                              init.id,
                              "priority",
                              e.target.value,
                            )
                          }
                          className={`w-full text-center px-2 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                            (init.priority || 'Alta') === 'Alta'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              : (init.priority || 'Alta') === 'Media'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                          title="Prioridad de la iniciativa (Alta, Media, Baja)"
                        >
                          <option value="Alta" className="bg-white text-rose-700 font-bold">Alta</option>
                          <option value="Media" className="bg-white text-amber-700 font-semibold">Media</option>
                          <option value="Baja" className="bg-white text-emerald-700 font-semibold">Baja</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-2 py-2 border-b border-gray-200 text-center align-middle">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(currentStatus)}`}
                            style={{ width: `${avgProgress}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-gray-700 text-xs min-w-[3ch]">
                          {avgProgress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2 border-b border-gray-200 text-center align-middle">
                      {currentStatus === "Desestimado" ? (
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full font-semibold text-[11px] text-center ${getStatusColor(currentStatus)}`}
                        >
                          Desestimado
                        </span>
                      ) : (
                        <select
                          value={currentStatus}
                          onChange={(e) => {
                            if (e.target.value === "Desestimado") {
                              setArchiveConfirmId(init.id);
                            } else if (e.target.value === "En pausa") {
                              setPauseModalInitId(init.id);
                              setPauseReasonInput("");
                            } else if (init.status === "En pausa") {
                              handleResumeInitiative(init);
                            } else {
                              updateInitiative(init.id, "status", "");
                            }
                          }}
                          className={`px-2 py-1 rounded-full font-semibold text-[11px] outline-none cursor-pointer appearance-none text-center ${getStatusColor(currentStatus)}`}
                          style={{ textAlignLast: "center" }}
                        >
                          <option
                            value="Pendiente"
                            disabled={currentStatus !== "Pendiente" && currentStatus !== "En pausa"}
                          >
                            Pendiente
                          </option>
                          <option
                            value="En proceso"
                            disabled={currentStatus !== "En proceso" && currentStatus !== "En pausa"}
                          >
                            En proceso
                          </option>
                          <option value="En pausa">En pausa</option>
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
                    <td className="px-2 py-2 border-b border-gray-200 text-center align-middle focus-within:bg-blue-50/40 transition-colors">
                      {!isComplete ? (
                        <div 
                          onClick={() => setIncompleteModalInit(init)}
                          className="w-full px-1.5 py-1 flex items-center justify-center gap-1 text-center text-xs font-semibold text-amber-800 bg-amber-50/90 rounded border border-amber-300/80 cursor-pointer hover:bg-amber-100 transition-colors select-none shadow-2xs"
                          title="Falta completar Descripción, Área o Responsable 1 antes de establecer la Fecha de Inicio. Haz clic para ver detalles."
                        >
                          <AlertTriangle size={12} className="text-amber-600 shrink-0" />
                          <span className="text-[10px]">Faltan datos</span>
                        </div>
                      ) : !isAdmin && Boolean(init.startDate) ? (
                        <div 
                          className="w-full px-1.5 py-1 flex items-center justify-center gap-1 text-center text-xs font-semibold text-gray-500 bg-gray-50/90 rounded border border-gray-200/80 cursor-not-allowed select-none"
                          title="Fecha de Inicio bloqueada: Solo un Administrador puede modificarla una vez establecida"
                        >
                          <Lock size={12} className="text-gray-400 shrink-0" />
                          <span>{init.startDate}</span>
                        </div>
                      ) : (
                        <SyncedInput
                          type="date"
                          value={init.startDate}
                          onChange={(e) =>
                            handleStartDateChange(init.id, e.target.value)
                          }
                          className="w-full px-1.5 py-1 bg-transparent rounded outline-none text-center text-xs font-medium text-gray-700 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                          title={isAdmin ? "Editar Fecha Inicio (Permiso de Administrador)" : "Establecer Fecha Inicio"}
                        />
                      )}
                    </td>
                    <td className="px-2 py-2 border-b border-gray-200 align-middle">
                      <TraceabilityCell
                        initiative={init}
                        onOpenPlan={() => {
                          if (!isComplete) {
                            setIncompleteModalInit(init);
                            return;
                          }
                          onOpen(init.id);
                        }}
                      />
                    </td>
                    <td className="px-2 py-2 border-b border-gray-200 text-center align-middle focus-within:bg-blue-50/40 transition-colors">
                      {(() => {
                        const isPaused = init.status === "En pausa";
                        let activePauseDays = 0;
                        let previewEnd = init.endDate;
                        if (isPaused && init.pausedAt) {
                          const pDate = new Date(init.pausedAt + "T12:00:00");
                          if (!isNaN(pDate.getTime())) {
                            const now = new Date();
                            now.setHours(12, 0, 0, 0);
                            activePauseDays = Math.max(0, Math.round((now.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24)));
                            if (activePauseDays > 0 && init.endDate) {
                              const endD = new Date(init.endDate + "T12:00:00");
                              if (!isNaN(endD.getTime())) {
                                endD.setDate(endD.getDate() + activePauseDays);
                                const yyyy = endD.getFullYear();
                                const mm = String(endD.getMonth() + 1).padStart(2, "0");
                                const dd = String(endD.getDate()).padStart(2, "0");
                                previewEnd = `${yyyy}-${mm}-${dd}`;
                              }
                            }
                          }
                        }

                        if (isPaused && activePauseDays > 0) {
                          return (
                            <div 
                              className="w-full px-1.5 py-0.5 flex flex-col items-center justify-center text-center text-xs font-semibold text-amber-950 bg-amber-100/90 rounded border border-amber-300 cursor-not-allowed select-none shadow-2xs"
                              title={`Iniciativa pausada: ${activePauseDays}d congelados. Fecha fin proyectada: ${previewEnd}`}
                            >
                              <div className="flex items-center gap-1 font-bold">
                                <Lock size={10} className="text-amber-700" />
                                <span>{previewEnd}</span>
                              </div>
                              <span className="text-[9px] text-amber-800 font-bold">Proy. (+{activePauseDays}d)</span>
                            </div>
                          );
                        }

                        if (!isAdmin) {
                          return (
                            <div 
                              className="w-full px-1.5 py-1 flex items-center justify-center gap-1 text-center text-xs font-semibold text-gray-500 bg-gray-50/90 rounded border border-gray-200/80 cursor-not-allowed select-none"
                              title="Fecha Fin bloqueada: Solo un Administrador puede modificarla, o se ajusta automáticamente al pausar/reanudar"
                            >
                              <Lock size={12} className="text-gray-400 shrink-0" />
                              <span>{init.endDate || "—"}</span>
                            </div>
                          );
                        }

                        return (
                          <SyncedInput
                            type="date"
                            value={init.endDate}
                            onChange={(e) =>
                              updateInitiative(init.id, "endDate", e.target.value)
                            }
                            className="w-full px-1.5 py-1 bg-transparent rounded outline-none text-center text-xs font-medium text-gray-700 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            title="Editar Fecha Fin (Permiso de Administrador)"
                          />
                        );
                      })()}
                    </td>
                    <td className="px-2 py-2 border-b border-gray-200 text-center align-middle">
                      <div className="flex items-center justify-center gap-1.5">
                        {init.status === "Desestimado" ? (
                          <button
                            onClick={() =>
                              updateInitiative(init.id, "status", "")
                            }
                            className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 font-medium text-xs transition-all cursor-pointer"
                            title="Recuperar iniciativa"
                          >
                            <RotateCcw size={14} /> Recuperar
                          </button>
                        ) : (
                          <>
                            {init.status === "En pausa" && (
                              <button
                                onClick={() => handleResumeInitiative(init)}
                                className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-amber-100 text-amber-900 hover:bg-amber-200 font-semibold text-xs transition-all cursor-pointer shadow-2xs"
                                title="Reanudar iniciativa (descongelar cronograma)"
                              >
                                <Play size={11} className="fill-current" /> Reanudar
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (!isComplete) {
                                  setIncompleteModalInit(init);
                                  return;
                                }
                                onOpen(init.id);
                              }}
                              className={`inline-flex items-center justify-center p-1.5 rounded-md font-medium text-xs transition-all ${
                                isComplete
                                  ? "bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
                                  : "bg-gray-100 text-gray-400 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 border border-transparent cursor-pointer"
                              }`}
                              title={
                                isComplete
                                  ? "Plan de Trabajo"
                                  : "Debes completar Descripción, Área y Responsable 1 antes de ingresar al Plan de Trabajo (clic para ver)"
                              }
                            >
                              <GanttChart size={16} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setDeleteConfirmId(init.id)}
                          className="p-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-all cursor-pointer"
                          title="Eliminar iniciativa"
                        >
                          <Trash2 size={14} />
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
    </main>

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

      {/* Modal para Pausar Iniciativa con Motivo Obligatorio */}
      {pauseModalInitId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold shrink-0">
                <Pause size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Pausar Iniciativa
                </h3>
                <p className="text-xs text-gray-500 line-clamp-1">
                  {initiatives.find((i) => i.id === pauseModalInitId)?.name || "Iniciativa"}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              El tiempo del proyecto se congelará a partir de hoy. Al reanudarlo, los días pausados se sumarán automáticamente a la fecha fin del proyecto para no distorsionar el plazo de 9 semanas.
            </p>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Motivo del inconveniente o pausa <span className="text-red-500">*</span>:
              </label>
              <textarea
                value={pauseReasonInput}
                onChange={(e) => setPauseReasonInput(e.target.value)}
                placeholder="Especifica el motivo por el cual el proyecto se pausa (ej. en espera de aprobación de ciberseguridad, retraso en API de terceros, etc.)..."
                className="w-full h-24 border border-gray-300 rounded-lg p-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none leading-relaxed"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setPauseModalInitId(null);
                  setPauseReasonInput("");
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg text-xs hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!pauseReasonInput.trim()}
                onClick={handleConfirmPause}
                className="px-4 py-2 bg-amber-600 text-white font-semibold rounded-lg text-xs hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Pause size={14} /> Confirmar Pausa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Reanudar Iniciativa con Registro de Trazabilidad */}
      {resumeModalInit && (() => {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        let previewDays = 0;
        if (resumeModalInit.pausedAt) {
          const pDate = new Date(resumeModalInit.pausedAt + "T12:00:00");
          if (!isNaN(pDate.getTime())) {
            previewDays = Math.max(0, Math.round((today.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24)));
          }
        }
        let previewEndDate = resumeModalInit.endDate;
        if (previewDays > 0 && resumeModalInit.endDate) {
          const endD = new Date(resumeModalInit.endDate + "T12:00:00");
          if (!isNaN(endD.getTime())) {
            endD.setDate(endD.getDate() + previewDays);
            const yyyy = endD.getFullYear();
            const mm = String(endD.getMonth() + 1).padStart(2, "0");
            const dd = String(endD.getDate()).padStart(2, "0");
            previewEndDate = `${yyyy}-${mm}-${dd}`;
          }
        }

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                  <Play size={20} className="fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Reanudar Iniciativa
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {resumeModalInit.name || "Iniciativa"}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2 mb-4">
                <div className="flex items-start justify-between">
                  <span className="text-gray-500">Motivo de la pausa:</span>
                  <span className="font-semibold text-gray-800 text-right max-w-[240px]">
                    {resumeModalInit.pauseReason || "No especificado"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Pausado desde:</span>
                  <span className="font-semibold text-gray-800">{resumeModalInit.pausedAt || "Hoy"}</span>
                </div>
                <div className="flex items-center justify-between text-amber-800 font-bold">
                  <span>Días en suspensión:</span>
                  <span>{previewDays} días</span>
                </div>
                <div className="border-t border-slate-200 pt-1.5 flex items-center justify-between">
                  <span className="text-gray-500">Ajuste de Fecha Fin:</span>
                  <span className="font-bold text-blue-700">
                    {resumeModalInit.endDate || "—"} ➔ {previewEndDate || "—"}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200 leading-snug">
                  ✓ <strong>Días netos de esfuerzo preservados:</strong> Los {previewDays} días de pausa se añaden a la fecha fin para mantener exactamente la misma cantidad de días de trabajo de las 9 semanas sin penalizar el cronograma.
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Comentario de reanudación / Solución del inconveniente (Opcional):
                </label>
                <textarea
                  value={resumeCommentInput}
                  onChange={(e) => setResumeCommentInput(e.target.value)}
                  placeholder="Detalle cómo se resolvió el inconveniente o motivo de reactivación (ej. Se recibió visto bueno y se retoman tareas)..."
                  className="w-full h-20 border border-gray-300 rounded-lg p-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none leading-relaxed"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setResumeModalInit(null);
                    setResumeCommentInput("");
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg text-xs hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmResume}
                  className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg text-xs hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Play size={13} className="fill-current" /> Confirmar Reanudación
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal para Crear Nueva Iniciativa con Datos Obligatorios */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-lg w-full border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <Plus size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Nueva Iniciativa
                </h3>
                <p className="text-xs text-gray-500">
                  Completa los 3 campos obligatorios para registrar la iniciativa y habilitar su cronograma.
                </p>
              </div>
            </div>

            <div className="space-y-4 my-4">
              {/* Campo 1: Descripción */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Descripción de la Iniciativa <span className="text-red-500">*</span>:
                </label>
                <textarea
                  value={newInitName}
                  onChange={(e) => setNewInitName(e.target.value)}
                  placeholder="ej. Automatización de conciliación y procesamiento de comprobantes con IA..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none leading-relaxed"
                  autoFocus
                />
              </div>

              {/* Campo 2: Área */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Área Iniciativa <span className="text-red-500">*</span>:
                </label>
                <select
                  value={newInitArea}
                  onChange={(e) => setNewInitArea(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white cursor-pointer"
                >
                  <option value="">-- Seleccionar Área --</option>
                  {allAvailableAreas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campo 3: Responsables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Responsable 1 <span className="text-red-500">*</span>:
                  </label>
                  <select
                    value={newInitResponsible}
                    onChange={(e) => setNewInitResponsible(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white cursor-pointer"
                  >
                    <option value="">-- Seleccionar Responsable 1 --</option>
                    {allAvailableResponsibles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Responsable 2 (Opcional):
                  </label>
                  <select
                    value={newInitResponsible2}
                    onChange={(e) => setNewInitResponsible2(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white cursor-pointer"
                  >
                    <option value="">-- Sin Asignar --</option>
                    {allAvailableResponsibles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Campo 4: Prioridad */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Prioridad:
                </label>
                <select
                  value={newInitPriority}
                  onChange={(e) => setNewInitPriority(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white cursor-pointer font-semibold"
                >
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
            </div>

            {/* Aviso de validación si faltan campos */}
            {(!newInitName.trim() || !newInitArea.trim() || !newInitResponsible.trim()) && (
              <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5 mb-4">
                <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                <span>Completa la <strong>Descripción</strong>, <strong>Área</strong> y <strong>Responsable 1</strong> para poder crear la iniciativa.</span>
              </p>
            )}

            <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg text-xs hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!newInitName.trim() || !newInitArea.trim() || !newInitResponsible.trim()}
                onClick={handleCreateInitiativeFromModal}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={15} /> Crear Iniciativa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Advertencia cuando faltan datos obligatorios */}
      {incompleteModalInit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Completar Datos Obligatorios
                </h3>
                <p className="text-xs text-gray-500">
                  Requisito previo para el cronograma y Plan de Trabajo
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              Para poder colocar la <strong>Fecha de Inicio</strong> e ingresar al <strong>Plan de Trabajo</strong>, primero debes completar los siguientes 3 campos obligatorios de la iniciativa:
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">1. Descripción de Iniciativa:</span>
                {Boolean(incompleteModalInit.name?.trim() && incompleteModalInit.name.trim() !== "Nueva Iniciativa") ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">✓ Completo</span>
                ) : (
                  <span className="text-red-600 font-bold flex items-center gap-1 text-[11px]">⚠️ Pendiente</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">2. Área Iniciativa:</span>
                {Boolean(incompleteModalInit.area?.trim()) ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">✓ Completo</span>
                ) : (
                  <span className="text-red-600 font-bold flex items-center gap-1 text-[11px]">⚠️ Pendiente</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">3. Responsable 1:</span>
                {Boolean(incompleteModalInit.responsible?.trim()) ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">✓ Completo</span>
                ) : (
                  <span className="text-red-600 font-bold flex items-center gap-1 text-[11px]">⚠️ Pendiente</span>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIncompleteModalInit(null)}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg text-xs hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
              >
                Entendido, completar en la tabla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
