import React from 'react';
import { useTranslation } from '../lib/i18n';
import { Globe } from 'lucide-react';

interface LanguageScreenProps {
  onSelect: () => void;
}

export function LanguageScreen({ onSelect }: LanguageScreenProps) {
  const { language, setLanguage, t } = useTranslation();

  const handleSelect = (lang: 'en' | 'ru' | 'uz') => {
    setLanguage(lang);
    localStorage.setItem('language_selected', 'true');
    onSelect();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#05070a] text-slate-900 dark:text-white flex items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-md">
        <div className="mb-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Select Language</h1>
          <p className="text-slate-500 dark:text-slate-400">Выберите язык / Tilni tanlang</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleSelect('en')}
            className={`w-full p-4 rounded-2xl border transition-all ${language === 'en' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/50 dark:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10'}`}
          >
            <div className="font-semibold text-lg">English</div>
          </button>
          <button
            onClick={() => handleSelect('ru')}
            className={`w-full p-4 rounded-2xl border transition-all ${language === 'ru' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/50 dark:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10'}`}
          >
            <div className="font-semibold text-lg">Русский</div>
          </button>
          <button
            onClick={() => handleSelect('uz')}
            className={`w-full p-4 rounded-2xl border transition-all ${language === 'uz' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/50 dark:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10'}`}
          >
            <div className="font-semibold text-lg">O'zbekcha</div>
          </button>
        </div>
      </div>
    </div>
  );
}
