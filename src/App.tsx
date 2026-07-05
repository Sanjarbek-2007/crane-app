/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Devices } from './pages/Devices';
import { DeviceDetails } from './pages/DeviceDetails';
import { Profile } from './pages/Profile';
import { SchedulesView } from './pages/SchedulesView';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { LanguageScreen } from './components/LanguageScreen';
import { Activity } from 'lucide-react';
import { useAppData } from './hooks/useAppData';

export type ViewType = 'dashboard' | 'devices' | 'device_details' | 'schedules' | 'profile';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [languageSelected, setLanguageSelected] = useState<boolean>(true);

  useEffect(() => {
    if (!localStorage.getItem('language_selected')) {
      setLanguageSelected(false);
    }
  }, []);

  const { devices, logs, schedules } = useAppData();

  if (!languageSelected) {
    return <LanguageScreen onSelect={() => setLanguageSelected(true)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#05070a] flex items-center justify-center">
        <Activity className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const selectedDevice = devices.find(d => d.id === selectedDeviceId);

  return (
    <Layout currentView={currentView} setCurrentView={setCurrentView} user={user}>
      {currentView === 'dashboard' && (
        <Dashboard 
          devices={devices} 
          logs={logs} 
          schedules={schedules} 
          onSelectDevice={(id) => { 
            setSelectedDeviceId(id); 
            setCurrentView('device_details'); 
          }}
          user={user}
        />
      )}
      {currentView === 'devices' && (
        <Devices 
          devices={devices} 
          onSelectDevice={(id) => { 
            setSelectedDeviceId(id); 
            setCurrentView('device_details'); 
          }} 
          user={user}
        />
      )}
      {currentView === 'device_details' && selectedDevice && (
        <DeviceDetails 
          device={selectedDevice} 
          schedules={schedules.filter(s => s.device_id === selectedDevice.id)}
          onBack={() => setCurrentView('devices')} 
          user={user}
        />
      )}
      {currentView === 'schedules' && (
        <SchedulesView schedules={schedules} devices={devices} user={user} />
      )}
      {currentView === 'profile' && (
        <Profile user={user} devices={devices} />
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
