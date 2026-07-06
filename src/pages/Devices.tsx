import React, { useState } from 'react';
import { Plus, Settings2, Signal, SignalHigh, WifiOff } from 'lucide-react';
import { AppDevice, claimDevice } from '../lib/db';
import { User } from 'firebase/auth';
import { useTranslation } from '../lib/i18n';

interface DevicesProps {
  devices: AppDevice[];
  onSelectDevice: (id: string) => void;
  user: User;
}

export function Devices({ devices, onSelectDevice, user }: DevicesProps) {
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimCode, setClaimCode] = useState('');
  const [claiming, setClaiming] = useState(false);
  const { t } = useTranslation();

  const handleClaim = async () => {
    if (!claimCode.trim() || !user.email) return;
    setClaiming(true);
    try {
      await claimDevice(claimCode, user.uid, user.email);
      setShowClaimModal(false);
      setClaimCode('');
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error claiming device");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('devices')}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Manage and monitor pipe cranes</p>
        </div>
        <button 
          onClick={() => setShowClaimModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" /> {t('add_device')}
        </button>
      </div>

      {devices.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[32px] mt-8 shadow-sm dark:shadow-none">
          <Settings2 className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('no_devices')}</h3>
          <p className="text-slate-500 dark:text-slate-400">{t('no_devices_desc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
          {devices.map(device => {
            const isOwner = device.owner_uid === user.uid;
            return (
              <div 
                key={device.id} 
                onClick={() => onSelectDevice(device.id)}
                className="p-6 rounded-[32px] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all cursor-pointer group flex flex-col"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      device.status === 'open' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' :
                      device.status === 'closed' ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300' :
                      device.status === 'opening' || device.status === 'closing' ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                      'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                    }`}>
                      {device.status === 'offline' ? <WifiOff className="w-5 h-5" /> : <Settings2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight text-slate-900 dark:text-white">{device.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{device.serial_number}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded border text-[10px] uppercase font-bold tracking-widest ${isOwner ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400' : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-white/5 dark:border-white/10 dark:text-slate-400'}`}>
                    {isOwner ? t('owner') : t('shared')}
                  </span>
                </div>

                <div className="mt-auto">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-500 dark:text-slate-400">{t('current_status')}</span>
                    <span className={`font-semibold capitalize ${
                      device.status === 'open' ? 'text-emerald-600 dark:text-emerald-400' :
                      device.status === 'closed' ? 'text-slate-600 dark:text-slate-300' :
                      device.status === 'opening' || device.status === 'closing' ? 'text-slate-500 dark:text-slate-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {device.status === 'open' ? t('open') :
                       device.status === 'opening' ? t('opening') :
                       device.status === 'closing' ? t('closing') :
                       t('close')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-white/5 pt-3 mt-3">
                    <div className="flex items-center gap-1">
                      {device.status === 'offline' ? <Signal className="w-3 h-3 text-red-500 dark:text-red-400" /> : <SignalHigh className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />}
                      <span>{t('last_seen')} {new Date(device.last_seen_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0f1219] border border-slate-200 dark:border-white/10 rounded-[32px] p-8 max-w-md w-full relative shadow-2xl">
            <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">{t('claim_new_device')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t('claim_desc')}</p>
            
            <input 
              type="text" 
              placeholder="e.g. CRN-00001-VNXQKP (the full code, not just the serial)"
              value={claimCode}
              onChange={e => setClaimCode(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white mb-6 focus:outline-none focus:border-indigo-500"
            />
            
            <div className="flex gap-4">
              <button 
                onClick={() => setShowClaimModal(false)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-sm font-medium transition-all text-slate-700 dark:text-slate-300"
              >
                {t('cancel')}
              </button>
              <button 
                onClick={handleClaim}
                disabled={claiming || !claimCode.trim()}
                className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {claiming ? t('claiming') : t('claim_device')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
