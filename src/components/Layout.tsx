import React from 'react';
import { Activity, HardDrive, LayoutDashboard, Cloud, User as UserIcon, LogOut, Clock } from 'lucide-react';
import { auth } from '../lib/firebase';
import { User } from 'firebase/auth';
import { ViewType } from '../App';
import { useTranslation } from '../lib/i18n';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  user: User;
}

export function Layout({ children, currentView, setCurrentView, user }: LayoutProps) {
  const initials = (user.displayName || user.email || 'U').substring(0, 2).toUpperCase();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#05070a] font-sans text-slate-900 dark:text-slate-100 overflow-hidden relative transition-colors">
      {/* Background Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      
      {/* Navigation Bar */}
      <nav className="flex items-center justify-between px-8 h-20 border-b border-slate-200 dark:border-white/10 backdrop-blur-md bg-white/80 dark:bg-white/5 z-10 sticky top-0 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">{t('app_title')}</span>
        </div>
        <div className="flex items-center gap-8 hidden md:flex">
          <div className="flex gap-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            <button 
              onClick={() => setCurrentView('dashboard')} 
              className={`${currentView === 'dashboard' ? 'text-indigo-600 dark:text-white border-b-2 border-indigo-500 pb-1' : 'hover:text-slate-900 dark:hover:text-white transition-colors'}`}
            >
              {t('dashboard')}
            </button>
            <button 
              onClick={() => setCurrentView('devices')} 
              className={`${currentView === 'devices' || currentView === 'device_details' ? 'text-indigo-600 dark:text-white border-b-2 border-indigo-500 pb-1' : 'hover:text-slate-900 dark:hover:text-white transition-colors'}`}
            >
              {t('devices')}
            </button>
            <button 
              onClick={() => setCurrentView('schedules')} 
              className={`${currentView === 'schedules' ? 'text-indigo-600 dark:text-white border-b-2 border-indigo-500 pb-1' : 'hover:text-slate-900 dark:hover:text-white transition-colors'}`}
            >
              {t('schedules')}
            </button>
            <button 
              onClick={() => setCurrentView('profile')} 
              className={`${currentView === 'profile' ? 'text-indigo-600 dark:text-white border-b-2 border-indigo-500 pb-1' : 'hover:text-slate-900 dark:hover:text-white transition-colors'}`}
            >
              {t('profile')}
            </button>
          </div>
          <div className="h-8 w-[1px] bg-slate-200 dark:bg-white/10"></div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold">{user.displayName || user.email?.split('@')[0]}</p>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-white/20 p-0.5">
              <div className="w-full h-full rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-600 dark:text-slate-300">{initials}</div>
            </div>
            <button 
              onClick={() => auth.signOut()}
              className="ml-2 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
              title={t('sign_out')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Workspace */}
      <main className="flex flex-1 p-4 md:p-8 gap-8 overflow-y-auto z-10 flex-col md:flex-row max-w-7xl mx-auto w-full">
        {/* Content Area */}
        <div className="flex-1 flex flex-col gap-6 pb-20 md:pb-0 w-full">
          {children}
        </div>
      </main>

      {/* App Dock (Mobile Navigation) */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 flex justify-center pb-6 z-50">
        <div className="flex items-center gap-2 p-2 rounded-2xl bg-white/80 dark:bg-[#05070a]/80 border border-slate-200 dark:border-white/20 backdrop-blur-2xl shadow-2xl transition-colors">
          <div onClick={() => setCurrentView('dashboard')} className={`w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-all ${currentView === 'dashboard' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-transparent text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10'}`}>
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div onClick={() => setCurrentView('devices')} className={`w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-all ${currentView === 'devices' || currentView === 'device_details' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-transparent text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10'}`}>
            <HardDrive className="w-6 h-6" />
          </div>
          <div onClick={() => setCurrentView('schedules')} className={`w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-all ${currentView === 'schedules' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-transparent text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10'}`}>
            <Clock className="w-6 h-6" />
          </div>
          <div onClick={() => setCurrentView('profile')} className={`w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-all ${currentView === 'profile' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-transparent text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10'}`}>
            <UserIcon className="w-6 h-6" />
          </div>
        </div>
      </footer>
    </div>
  );
}
