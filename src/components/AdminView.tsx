import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Shield, Database, Users, Sliders, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Initiative } from '../types';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';

interface AdminViewProps {
  initiatives: Initiative[];
  onBack: () => void;
  userProfile?: { name: string; email: string } | null;
}

export default function AdminView({ initiatives, onBack, userProfile }: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'areas' | 'parameters' | 'users'>('general');
  const [savedMessage, setSavedMessage] = useState(false);

  const [defaultItRate, setDefaultItRate] = useState<number>(45);
  const [defaultLaborRate, setDefaultLaborRate] = useState<number>(25);
  interface AppArea {
    id: string;
    name: string;
  }
  const [customAreas, setCustomAreas] = useState<AppArea[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);

  useEffect(() => {
    const fetchAreas = async () => {
      setAreasLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'areas'));
        const loadedAreas = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || ''
        })).filter(a => a.name);
        setCustomAreas(loadedAreas);
      } catch (error) {
        console.error("Error fetching areas:", error);
      }
      setAreasLoading(false);
    };

    fetchAreas();
  }, []);

  const [newAreaInput, setNewAreaInput] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  const addArea = async () => {
    const areaName = newAreaInput.trim();
    if (areaName && !customAreas.find(a => a.name === areaName)) {
      try {
        const docRef = await addDoc(collection(db, 'areas'), { name: areaName });
        setCustomAreas([...customAreas, { id: docRef.id, name: areaName }]);
        setNewAreaInput('');
      } catch (error) {
        console.error("Error adding area:", error);
      }
    }
  };

  const removeArea = async (areaToRemoveId: string) => {
    try {
      await deleteDoc(doc(db, 'areas', areaToRemoveId));
      setCustomAreas(customAreas.filter(a => a.id !== areaToRemoveId));
    } catch (error) {
      console.error("Error removing area:", error);
    }
  };

  interface AppUser {
    id: string;
    name: string;
    email: string;
    role: string;
    password?: string;
  }

  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchUsers = async () => {
      setUsersLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const loadedUsers = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || '',
          email: doc.data().email || '',
          role: doc.data().role || 'Usuario',
          password: doc.data().password || ''
        }));
        setAppUsers(loadedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
      setUsersLoading(false);
    };

    fetchUsers();
  }, []);

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('Usuario');

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) return;
    
    try {
      const docRef = await addDoc(collection(db, 'users'), {
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword.trim(),
        role: newUserRole
      });
      
      const newUser: AppUser = {
        id: docRef.id,
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole
      };
      
      setAppUsers([...appUsers, newUser]);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('Usuario');
    } catch (error) {
      console.error("Error adding user:", error);
    }
  };

  const removeUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      const updated = appUsers.filter(u => u.id !== userId);
      setAppUsers(updated);
    } catch (error) {
      console.error("Error removing user:", error);
    }
  };

  const isSuperAdmin = userProfile?.email === 'kayme@flesan.com.pe';

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[1600px] bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors flex items-center justify-center"
              title="Volver a Iniciativas"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Settings size={22} className="text-blue-600" />
                Panel de Administración y Configuración
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Gestión de parámetros globales, áreas organizacionales y configuraciones del sistema
              </p>
            </div>
          </div>
          {savedMessage && (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 text-sm font-medium">
              <CheckCircle size={16} />
              <span>Configuración guardada exitosamente</span>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 flex gap-4">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sliders size={16} /> Parámetros Generales
          </button>
          <button
            onClick={() => setActiveTab('areas')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'areas'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Database size={16} /> Gestión de Áreas / Pilares
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('users')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'users'
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users size={16} /> Usuario y Permisos
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {activeTab === 'general' && (
            <form onSubmit={handleSave} className="max-w-3xl space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-gray-800">Tarifas y Costos Estándar por Hora</h3>
                <p className="text-xs text-gray-500">Define los valores por defecto utilizados en los cálculos de ROI y AS-IS vs TO-BE para nuevas iniciativas.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Costo Hora IT / Desarrollador ($ / hora)</label>
                    <input
                      type="number"
                      value={defaultItRate}
                      onChange={(e) => setDefaultItRate(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Costo Hora Hombre Operativa Promedio ($ / hora)</label>
                    <input
                      type="number"
                      value={defaultLaborRate}
                      onChange={(e) => setDefaultLaborRate(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg text-sm shadow-sm transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          )}

          {activeTab === 'areas' && (
            <div className="max-w-3xl space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-gray-800">Áreas y Pilares Organizacionales</h3>
                <p className="text-xs text-gray-500">Agrega o administra las áreas disponibles para categorizar las iniciativas estratégicas.</p>
                
                <div className="flex gap-3 pt-2">
                  <input
                    type="text"
                    value={newAreaInput}
                    onChange={(e) => setNewAreaInput(e.target.value)}
                    placeholder="Nueva área o pilar..."
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addArea}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Agregar Área
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 mt-4">
                  {areasLoading ? (
                    <div className="p-4 text-center text-sm text-gray-500">Cargando áreas...</div>
                  ) : customAreas.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">No hay áreas registradas</div>
                  ) : (
                    customAreas.map((area) => (
                      <div key={area.id} className="flex items-center justify-between p-3.5 hover:bg-gray-50">
                        <span className="text-sm font-medium text-gray-800">{area.name}</span>
                        <button
                          onClick={() => removeArea(area.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-semibold px-2.5 py-1 rounded border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && isSuperAdmin && (
            <div className="max-w-5xl space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-gray-800">Agregar Nuevo Usuario</h3>
                <p className="text-xs text-gray-500">Completa los datos para registrar un nuevo usuario con acceso a la plataforma.</p>
                
                <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nombre Completo</label>
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Ej. Juan Pérez"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="correo@empresa.com"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Contraseña</label>
                    <input
                      type="text"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Contraseña"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Rol</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Usuario">Usuario</option>
                      <option value="Visualizador">Visualizador</option>
                      <option value="Administrador">Administrador</option>
                    </select>
                  </div>
                  <div className="md:col-span-1">
                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Registrar Usuario
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-gray-800">Usuarios Registrados</h3>
                <p className="text-xs text-gray-500">Lista de usuarios registrados que aparecerán como responsables en las iniciativas.</p>
                
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Correo</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contraseña</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {usersLoading ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-sm text-gray-500">
                            Cargando usuarios...
                          </td>
                        </tr>
                      ) : appUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-sm text-gray-500">
                            No hay usuarios registrados
                          </td>
                        </tr>
                      ) : (
                        appUsers.map((u) => {
                          const showPass = visiblePasswords[u.id] || false;
                          return (
                          <tr key={u.id} className="hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm font-medium text-gray-800">{u.name}</td>
                          <td className="py-3 px-4 text-sm text-gray-500">{u.email}</td>
                          <td className="py-3 px-4 text-sm">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              u.role === 'Administrador' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {u.role === 'Administrador' && <Shield size={10} />}
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 font-mono">
                            <div className="flex items-center gap-2">
                              <span>{showPass ? (u.password || '—') : '•••••'}</span>
                              {u.password && (
                                <button
                                  type="button"
                                  onClick={() => setVisiblePasswords(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                                  className="text-gray-400 hover:text-gray-600 p-1"
                                  title={showPass ? "Ocultar contraseña" : "Ver contraseña"}
                                >
                                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {u.email !== 'kayme@flesan.com.pe' && (
                              <button
                                onClick={() => removeUser(u.id)}
                                className="text-red-500 hover:text-red-700 text-xs font-semibold px-2.5 py-1 rounded border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                              >
                                Eliminar
                              </button>
                            )}
                          </td>
                        </tr>
                        );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

