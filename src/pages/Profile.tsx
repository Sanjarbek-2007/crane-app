import React from 'react';
import { User } from 'firebase/auth';
import { AppDevice } from '../lib/db';
import { Calendar, HardDrive, Shield, Globe, Moon, Sun } from 'lucide-react';
import { useTranslation, Language } from '../lib/i18n';
import { useTheme } from '../lib/theme';

export function Profile({ user, devices }: { user: User, devices: AppDevice[] }) {
  const joinDate = user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown';
  const ownedDevices = devices.filter(d => d.owner_uid === user.uid).length;
  const sharedDevices = devices.length - ownedDevices;
  const { t, language, setLanguage } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="max-w-2xl mx-auto w-full mt-8 flex flex-col gap-8">
      <div className="p-8 rounded-[40px] bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-white/10 dark:to-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-xl relative overflow-hidden">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-500/20 border-2 border-indigo-200 dark:border-indigo-500/50 flex items-center justify-center text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {(user.displayName || user.email || 'U').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-3xl font-bold">{user.displayName || 'User'}</h2>
            <p className="text-slate-500 dark:text-slate-400 font-mono mt-1">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold">{t('total_devices')}</p>
              <p className="text-2xl font-bold">{devices.length}</p>
              <p className="text-xs text-slate-600 dark:text-slate-500">{ownedDevices} {t('owner')}, {sharedDevices} {t('shared')}</p>
            </div>
          </div>
          
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold">{t('joined_platform')}</p>
              <p className="text-xl font-bold mt-1">{joinDate}</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center gap-4 md:col-span-2">
            <div className="p-3 bg-slate-200 dark:bg-slate-500/20 rounded-xl text-slate-600 dark:text-slate-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold">{t('account_security')}</p>
              <p className="text-base font-semibold mt-1">{t('auth_google')}</p>
              <p className="text-xs text-slate-600 dark:text-slate-500 break-all">{user.uid}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 rounded-[40px] bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-white/10 dark:to-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-xl relative overflow-hidden">
        <h3 className="text-xl font-bold mb-6">{t('language_settings')}</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {(['en', 'ru', 'uz'] as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                language === lang 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-500/20 dark:border-indigo-500/50 dark:text-indigo-400' 
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10'
              }`}
            >
              <Globe className="w-6 h-6" />
              <span className="font-semibold uppercase tracking-wider">{lang === 'en' ? 'English' : lang === 'ru' ? 'Русский' : 'O\'zbek'}</span>
            </button>
          ))}
        </div>

        <h3 className="text-xl font-bold mb-6">{t('theme')}</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setTheme('light')}
            className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
              theme === 'light' 
                ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-500/20 dark:border-amber-500/50 dark:text-amber-500' 
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10'
            }`}
          >
            <Sun className="w-6 h-6" />
            <span className="font-semibold">{t('light_mode')}</span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
              theme === 'dark' 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-500/20 dark:border-indigo-500/50 dark:text-indigo-400' 
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10'
            }`}
          >
            <Moon className="w-6 h-6" />
            <span className="font-semibold">{t('dark_mode')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
