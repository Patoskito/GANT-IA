/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import MainView from './components/MainView';
import Spreadsheet from './components/Spreadsheet';
import Auth from './components/Auth';
import DashboardView from './components/DashboardView';
import AdminView from './components/AdminView';
import WeeklyAgenda from './components/WeeklyAgenda';
import { Initiative } from './types';
import { useInitiatives } from './hooks/useInitiatives';

import { USER_DICTIONARY } from './utils/userMapping';
import { db } from './lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { recordUserLogin, recordUserHeartbeat, recordUserLogout } from './utils/presence';

// 15 minutos de inactividad ideal para cierre automático de sesión corporativa
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

export default function App() {
  const [mainTitle, setMainTitle] = useState('Iniciativas IA 2026');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAgenda, setShowAgenda] = useState(false);
  const [userProfile, setUserProfile] = useState<{name: string, email: string, role?: string} | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);

  // Referencia para rastrear la última interacción del usuario (mouse, teclado, touch, scroll)
  const lastActivityRef = React.useRef<number>(Date.now());

  const { 
    initiatives, 
    loading: initiativesLoading, 
    addInitiative, 
    updateInitiative, 
    updateFullInitiative, 
    deleteInitiative 
  } = useInitiatives(userProfile);

  useEffect(() => {
    const checkSavedUser = async () => {
      const savedEmail = localStorage.getItem('local_auth_email');
      if (savedEmail) {
        const mappedName = USER_DICTIONARY[savedEmail];
        let role = savedEmail === 'kayme@flesan.com.pe' ? 'Administrador' : 'Usuario';
        try {
          const q = query(collection(db, 'users'), where('email', '==', savedEmail.trim()));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            if (userData.role) role = userData.role;
          }
        } catch (e) {
          console.error("Error fetching user role", e);
        }
        const finalName = mappedName || savedEmail.split('@')[0] || 'Usuario';
        setUserProfile({
          name: finalName,
          email: savedEmail,
          role
        });
        // Registrar ingreso en Firestore
        recordUserLogin(savedEmail, finalName, role);
        lastActivityRef.current = Date.now();
      }
      setAuthLoading(false);
    };
    checkSavedUser();
  }, []);

  // Latido / presencia periódica cada 60 segundos mientras el usuario tenga la app abierta
  useEffect(() => {
    if (!userProfile?.email) return;
    const interval = setInterval(() => {
      recordUserHeartbeat(userProfile.email);
    }, 60000);
    return () => clearInterval(interval);
  }, [userProfile?.email]);

  const handleLogout = async (reason: 'manual' | 'inactivity' = 'manual') => {
    const emailToLogout = userProfile?.email;
    if (emailToLogout) {
      // Registrar desconexión y hora de salida exacta en Firestore
      await recordUserLogout(emailToLogout, reason);
    }
    localStorage.removeItem('local_auth_email');
    if (reason === 'inactivity') {
      setSessionExpiredMessage('Tu sesión ha expirado tras 15 minutos de inactividad. Por favor, vuelve a iniciar sesión para continuar.');
    } else {
      setSessionExpiredMessage(null);
    }
    setUserProfile(null);
  };

  // Monitoreo de actividad del usuario (mouse, teclado, touch, scroll)
  useEffect(() => {
    if (!userProfile?.email) return;

    let lastRecordedActivity = Date.now();
    lastActivityRef.current = Date.now();

    const handleUserActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;

      // Throttle para enviar latido en actividad si pasaron más de 2 minutos
      if (now - lastRecordedActivity > 120000) {
        lastRecordedActivity = now;
        recordUserHeartbeat(userProfile.email);
      }
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Verificación cada 10 segundos del tiempo de inactividad
    const idleCheckInterval = setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= INACTIVITY_TIMEOUT_MS) {
        // Cerrar sesión automáticamente por inactividad
        handleLogout('inactivity');
      }
    }, 10000);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      clearInterval(idleCheckInterval);
    };
  }, [userProfile?.email]);

  const activeInitiative = initiatives.find(i => i.id === activeId);

  if (authLoading || (userProfile && initiativesLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="font-sans">
      {!userProfile ? (
        <Auth 
          onLogin={(user) => {
            setSessionExpiredMessage(null);
            setUserProfile(user);
          }} 
          sessionExpiredMessage={sessionExpiredMessage}
        />
      ) : (
        <>
          {showAgenda ? (
            <WeeklyAgenda
              initiatives={initiatives}
              userProfile={userProfile}
              onBack={() => setShowAgenda(false)}
            />
          ) : showDashboard ? (
            <DashboardView
              initiatives={initiatives}
              onBack={() => setShowDashboard(false)}
            />
          ) : showAdmin ? (
            <AdminView
              initiatives={initiatives}
              onBack={() => setShowAdmin(false)}
              userProfile={userProfile}
            />
          ) : activeInitiative ? (
            <Spreadsheet 
              initiative={activeInitiative} 
              onUpdate={updateFullInitiative}
              onBack={() => setActiveId(null)} 
              userProfile={userProfile}
            />
          ) : (
            <MainView 
              title={mainTitle}
              setTitle={setMainTitle}
              initiatives={initiatives}
              onAdd={addInitiative}
              onUpdate={updateInitiative}
              onOpen={(id) => setActiveId(id)}
              onDelete={deleteInitiative}
              userProfile={userProfile}
              onLogout={handleLogout}
              onOpenAgenda={() => setShowAgenda(true)}
              onOpenDashboard={() => setShowDashboard(true)}
              onOpenAdmin={() => setShowAdmin(true)}
            />
          )}
        </>
      )}
    </div>
  );
}
