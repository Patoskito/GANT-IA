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
import { Initiative } from './types';
import { useInitiatives } from './hooks/useInitiatives';

import { USER_DICTIONARY } from './utils/userMapping';

export default function App() {
  const [mainTitle, setMainTitle] = useState('Iniciativas IA 2026');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<{name: string, email: string} | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const { 
    initiatives, 
    loading: initiativesLoading, 
    addInitiative, 
    updateInitiative, 
    updateFullInitiative, 
    deleteInitiative 
  } = useInitiatives(userProfile);

  useEffect(() => {
    const savedEmail = localStorage.getItem('local_auth_email');
    if (savedEmail) {
      const mappedName = USER_DICTIONARY[savedEmail];
      setUserProfile({
        name: mappedName || savedEmail.split('@')[0] || 'Usuario',
        email: savedEmail
      });
    }
    setAuthLoading(false);
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('local_auth_email');
    setUserProfile(null);
  };

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
        <Auth onLogin={setUserProfile} />
      ) : (
        <>
          {showDashboard ? (
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
              onOpenDashboard={() => setShowDashboard(true)}
              onOpenAdmin={() => setShowAdmin(true)}
            />
          )}
        </>
      )}
    </div>
  );
}
