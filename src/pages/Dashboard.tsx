import React from 'react';
import { CheckCircle, Clock, Settings2, WifiOff, Signal, SignalHigh, ChevronRight } from 'lucide-react';
import { AppDevice, AppLog, AppSchedule } from '../lib/db';
import { User } from 'firebase/auth';
import { useTranslation } from '../lib/i18n';

interface DashboardProps {
  devices: AppDevice[];
  logs: AppLog[];
  schedules: AppSchedule[];
  onSelectDevice: (id: string) => void;
  user: User;
}

export function Dashboard({ devices, logs, schedules, onSelectDevice, user }: DashboardProps) {
  const onlineCount = devices.filter(d => d.status !== 'offline').length;
  const openCount = devices.filter(d => d.status === 'open').length;
  const pendingSchedules = schedules.filter(s => s.status === 'pending').length;
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-xl">
          <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1 md:mb-2 truncate">{t('total_devices')}</p>
          <p className="text-base md:text-lg font-bold text-slate-900 dark:text-white">{devices.length}</p>
        </div>
        <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-xl">
          <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1 md:mb-2 truncate">{t('online')}</p>
          <p className="text-base md:text-lg font-bold text-emerald-600 dark:text-emerald-400">{onlineCount}</p>
        </div>
        <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-xl">
          <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1 md:mb-2 truncate">{t('open_valves')}</p>
          <p className="text-base md:text-lg font-bold text-indigo-600 dark:text-indigo-400">{openCount}</p>
        </div>
        <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-xl">
          <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1 md:mb-2 truncate">{t('pending_schedules')}</p>
          <p className="text-base md:text-lg font-bold text-orange-600 dark:text-orange-400">{pendingSchedules}</p>
        </div>
      </div>

      {devices.length > 0 && (
        <div>
          <h2 className="text-lg md:text-xl font-bold mb-4 px-1 text-slate-900 dark:text-white">{t('quick_access')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {devices.slice(0, 3).map(device => {
              return (
                <div 
                  key={device.id} 
                  onClick={() => onSelectDevice(device.id)}
                  className="p-4 md:p-5 rounded-2xl md:rounded-[32px] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all cursor-pointer group flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${device.status === 'open' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : device.status === 'closed' ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300' : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'}`}>
                        {device.status === 'offline' ? <WifiOff className="w-5 h-5" /> : <Settings2 className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm md:text-base leading-tight truncate text-slate-900 dark:text-white">{device.name}</h3>
                        <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-mono truncate">{device.serial_number}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-white/5 pt-3">
                    <div className="flex items-center gap-1">
                      {device.status === 'offline' ? <Signal className="w-3 h-3 text-red-500 dark:text-red-400" /> : <SignalHigh className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />}
                      <span className={`capitalize font-semibold ${device.status === 'open' ? 'text-emerald-600 dark:text-emerald-400' : device.status === 'closed' ? 'text-slate-500 dark:text-slate-300' : 'text-red-600 dark:text-red-400'}`}>{device.status === 'open' ? t('open') : t('close')}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 dark:text-slate-600 dark:group-hover:text-white transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 p-5 md:p-8 rounded-3xl md:rounded-[40px] bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-white/10 dark:to-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-xl flex flex-col relative overflow-hidden">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">{t('recent_activity')}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">{t('recent_activity_subtitle')}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {logs.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('no_recent_activity')}</p>
          ) : (
            logs.slice(0, 10).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${log.action === 'open' ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-slate-200 dark:bg-white/5'}`}>
                    {log.action === 'open' ? <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400"/> : <Clock className="w-5 h-5 text-slate-500 dark:text-slate-400"/>}
                  </div>
                  <div>
                    <p className="font-medium text-sm md:text-base capitalize text-slate-900 dark:text-white">{log.action === 'open' ? t('open') : t('close')} <span className="text-slate-500 dark:text-slate-400 text-sm">· {log.device_name}</span></p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">{t('initiated_by')} {log.issued_by} ({log.source})</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
