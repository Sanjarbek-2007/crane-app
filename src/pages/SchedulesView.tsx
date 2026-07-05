import React from 'react';
import { AppSchedule, AppDevice, cancelSchedule } from '../lib/db';
import { User } from 'firebase/auth';
import { Clock, Trash2 } from 'lucide-react';
import { useTranslation } from '../lib/i18n';

export function SchedulesView({ schedules, devices, user }: { schedules: AppSchedule[], devices: AppDevice[], user: User }) {
  const { t } = useTranslation();

  const handleCancel = async (id: string) => {
    if (confirm("Cancel this schedule?")) {
      await cancelSchedule(id);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('all_schedules') || 'All Schedules'}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">{t('schedules_subtitle') || 'Upcoming and executed tasks'}</p>
      </div>

      <div className="p-6 rounded-[32px] bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-white/10 dark:to-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-xl relative overflow-hidden transition-colors">
        {schedules.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('no_schedules') || 'No schedules found.'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {schedules.map(s => {
              const date = new Date(s.scheduled_at);
              const isPast = date.getTime() < Date.now();
              return (
                <div key={s.id} className={`flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-2xl border ${s.status === 'executed' ? 'bg-slate-50 border-slate-200 dark:bg-white/5 dark:border-white/5' : 'bg-indigo-50 border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/20'}`}>
                  <div>
                    <h4 className="font-bold text-lg text-slate-900 dark:text-white">{s.device_name}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {t('action') || 'Action'}: <span className="font-semibold text-slate-900 dark:text-white capitalize">{s.action === 'open' ? (t('open') || 'Open') : (t('close') || 'Close')}</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{t('created_by') || 'Created by'} {s.created_by}</p>
                  </div>
                  <div className="mt-4 md:mt-0 flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-mono text-sm text-slate-900 dark:text-slate-300">{date.toLocaleDateString()} {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-widest mt-1 inline-block ${s.status === 'executed' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'}`}>
                        {s.status}
                      </span>
                    </div>
                    {s.status === 'pending' && (
                      <button onClick={() => handleCancel(s.id)} className="p-2 bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 rounded-xl transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
