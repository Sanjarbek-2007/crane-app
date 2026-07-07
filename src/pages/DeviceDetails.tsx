import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Clock, Settings2, Users, X } from 'lucide-react';
import { AppDevice, AppSchedule, toggleDevice, addSchedule, shareDevice, removeShare } from '../lib/db';
import { User } from 'firebase/auth';
import { useTranslation } from '../lib/i18n';

interface DeviceDetailsProps {
  device: AppDevice;
  schedules: AppSchedule[];
  onBack: () => void;
  user: User;
}

// A real ball valve: handle aligned with the pipe (pointing left) = open,
// handle perpendicular (pointing up) = closed - matching how these
// actually work, not an abstract on/off icon.
function ValveIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg viewBox="0 0 200 140" className="w-32 h-[5.6rem] drop-shadow-lg">
      {/* Left pipe, threaded */}
      <rect x="0" y="55" width="66" height="30" rx="3" fill="#3b5bab" />
      {[10, 20, 30, 40, 50, 60].map((x) => (
        <line key={`l-${x}`} x1={x} y1="57" x2={x} y2="83" stroke="#28407f" strokeWidth="1.5" />
      ))}
      {/* Right pipe, threaded */}
      <rect x="134" y="55" width="66" height="30" rx="3" fill="#3b5bab" />
      {[140, 150, 160, 170, 180, 190].map((x) => (
        <line key={`r-${x}`} x1={x} y1="57" x2={x} y2="83" stroke="#28407f" strokeWidth="1.5" />
      ))}
      {/* Coupling flanges */}
      <rect x="58" y="47" width="18" height="46" rx="2" fill="#5b7bc7" stroke="#28407f" strokeWidth="1.5" />
      <rect x="124" y="47" width="18" height="46" rx="2" fill="#5b7bc7" stroke="#28407f" strokeWidth="1.5" />
      {/* Valve body */}
      <circle cx="100" cy="70" r="40" fill="#4a6bbd" stroke="#28407f" strokeWidth="2.5" />
      <circle cx="100" cy="70" r="27" fill="#3b5bab" stroke="#28407f" strokeWidth="1.5" />
      {/* Handle pivot bolt */}
      <circle cx="100" cy="70" r="9" fill="#1f2937" stroke="#0f172a" strokeWidth="1.5" />
      {/* Handle - rotates around the pivot; left/aligned-with-pipe = open, up/perpendicular = closed */}
      <g
        style={{
          transform: `rotate(${isOpen ? -90 : 0}deg)`,
          transformOrigin: '100px 70px',
          transition: 'transform 0.7s cubic-bezier(0.34, 1.2, 0.64, 1)',
        }}
      >
        <rect x="93" y="15" width="14" height="58" rx="7" fill={isOpen ? '#10b981' : '#ef4444'} stroke={isOpen ? '#047857' : '#b91c1c'} strokeWidth="1.5" />
        <rect x="84" y="8" width="32" height="18" rx="9" fill={isOpen ? '#059669' : '#dc2626'} stroke={isOpen ? '#047857' : '#b91c1c'} strokeWidth="1.5" />
      </g>
    </svg>
  );
}

export function DeviceDetails({ device, schedules, onBack, user }: DeviceDetailsProps) {
  const [isCommandLoading, setIsCommandLoading] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const [scheduleAction, setScheduleAction] = useState<'open' | 'closed'>('open');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const [shareEmail, setShareEmail] = useState('');
  const { t } = useTranslation();

  // device.status is device-confirmed (see AppDevice) - it only reaches
  // 'open'/'closed' once the crane itself reports the move actually
  // finished. When that confirmation just arrived, flash "Opened"/"Closed"
  // for 2s before the button reverts to its normal actionable state.
  const [justConfirmed, setJustConfirmed] = useState<'opened' | 'closed' | null>(null);
  const prevStatusRef = useRef(device.status);

  // Always holds the latest status, readable from inside the setTimeout
  // closure below (which is set up once per press and must see status as
  // of 10s later, not as of the moment the button was pressed).
  const statusRef = useRef(device.status);
  useEffect(() => {
    statusRef.current = device.status;
  }, [device.status]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = device.status;
    if (prev === 'opening' && device.status === 'open') {
      setJustConfirmed('opened');
      const timer = setTimeout(() => setJustConfirmed(null), 2000);
      return () => clearTimeout(timer);
    }
    if (prev === 'closing' && device.status === 'closed') {
      setJustConfirmed('closed');
      const timer = setTimeout(() => setJustConfirmed(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [device.status]);

  // A "opening"/"closing" status is only meaningful while the device is
  // actually still checking in - if it's gone completely silent (no
  // last_seen_at update) well past how long a real move plus retries could
  // possibly take, that status is just stale, not an ongoing move, and
  // must not permanently lock the control out. 90s covers TRANSITION_MS
  // (30s) plus the device's own poll interval/retry slack with real margin.
  const STALE_THRESHOLD_MS = 90000;
  const isStale = Date.now() - device.last_seen_at > STALE_THRESHOLD_MS;
  const isMidTransition = (device.status === 'opening' || device.status === 'closing') && !isStale;
  // Was showing a transition, but the device hasn't been heard from in
  // way longer than a move could take - its real position is unknown, so
  // offer both actions explicitly instead of guessing which one to show.
  const isStaleTransition = (device.status === 'opening' || device.status === 'closing') && isStale;

  // How long to wait for the device to acknowledge a command before telling
  // the user it might not have gone through. The device only polls the
  // server every ~7s when idle, and a single AT+HTTP exchange over 2G/GPRS
  // can itself legitimately take up to ~30s by design - so the real
  // worst-case path (poll wait + HTTP round trip + this page's own 4s
  // polling to notice) is well over 10s even when everything is working
  // fine. 10s caused false "device not responding" alarms on normal,
  // successful commands - 25s gives real headroom for a working-but-slow
  // connection while still catching an actually-unresponsive device.
  const CONFIRMATION_TIMEOUT_MS = 25000;

  const handleToggle = async (explicitTarget?: 'open' | 'closed') => {
    if (!user.email || isMidTransition) return;
    setIsCommandLoading(true);
    const statusBeforeRequest = device.status;
    try {
      // This only sets the desired status - it's a request, not a
      // confirmation. The button stays showing "Opening.../Closing..."
      // (driven by device.status, not this call) until the device itself
      // calls back to say it actually happened.
      const target = explicitTarget || (device.status === 'open' ? 'closed' : 'open');
      await toggleDevice(device, target, user.email);

      // If the device hasn't started moving (status hasn't left its
      // pre-request value) within CONFIRMATION_TIMEOUT_MS, let the user
      // know rather than leaving them guessing whether it was received.
      setTimeout(() => {
        if (statusRef.current === statusBeforeRequest) {
          alert(t('device_not_responding'));
        }
      }, CONFIRMATION_TIMEOUT_MS);
    } catch (e) {
      alert("Error sending command");
    } finally {
      setIsCommandLoading(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.email || !scheduleDate || !scheduleTime) return;
    
    const dateTimeStr = `${scheduleDate}T${scheduleTime}`;
    const ms = new Date(dateTimeStr).getTime();
    
    if (ms <= Date.now()) {
      alert("Schedule time must be in the future");
      return;
    }

    try {
      await addSchedule(device, scheduleAction, ms, user.email);
      setShowScheduleModal(false);
    } catch (err) {
      alert("Failed to schedule");
    }
  };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmail) return;
    try {
      await shareDevice(device, shareEmail);
      setShareEmail('');
    } catch (err) {
      alert("Failed to share");
    }
  };

  const handleRemoveShare = async (email: string) => {
    if (confirm(`Remove access for ${email}?`)) {
      await removeShare(device, email);
    }
  };

  const isOwner = device.owner_uid === user.uid;

  return (
    <div className="flex flex-col h-full gap-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white self-start transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t('back')}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Control Card */}
        <div className="lg:col-span-2 p-8 rounded-[40px] bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-white/10 dark:to-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-xl relative overflow-hidden flex flex-col justify-between min-h-[400px]">
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold mb-1 text-slate-900 dark:text-white">{device.name}</h2>
              <p className="text-slate-500 dark:text-slate-400 font-mono text-sm">{device.serial_number}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest ${
              isStaleTransition ? 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/20' :
              device.status === 'open' ? 'bg-emerald-100 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/20' :
              isMidTransition ? 'bg-slate-200 text-slate-600 border border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600' :
              'bg-red-100 text-red-600 border border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/20'
            }`}>
              {isStaleTransition ? t('device_stale_badge') :
               device.status === 'open' ? t('open') : device.status === 'opening' ? t('opening') : device.status === 'closing' ? t('closing') : t('close')}
            </span>
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center my-8">
            <button
              onClick={() => handleToggle()}
              disabled={isCommandLoading || isMidTransition || justConfirmed !== null}
              className={`w-48 h-48 rounded-full flex flex-col items-center justify-center gap-3 transition-all duration-500 shadow-2xl relative
                ${isCommandLoading || isMidTransition ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 scale-95' :
                  justConfirmed === 'opened' ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-emerald-500/30' :
                  justConfirmed === 'closed' ? 'bg-gradient-to-b from-red-500 to-red-700 text-white shadow-red-500/30' :
                  device.status === 'open' ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-emerald-500/30 hover:scale-105' :
                  'bg-gradient-to-b from-red-500 to-red-700 text-white shadow-red-500/30 hover:scale-105'}
                disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden`}
            >
              {(isCommandLoading || isMidTransition) && (
                <div className="absolute inset-0 rounded-full border-4 border-t-slate-300 dark:border-t-white/50 border-slate-200 dark:border-white/10 animate-spin"></div>
              )}

              <div className="mb-1">
                <ValveIcon isOpen={device.status === 'open' || justConfirmed === 'opened'} />
              </div>

              <span className="font-bold tracking-widest uppercase text-sm z-10">
                {justConfirmed === 'opened' ? t('opened') :
                 justConfirmed === 'closed' ? t('closed') :
                 isMidTransition ? (device.status === 'opening' ? t('opening') : t('closing')) :
                 isCommandLoading ? t('claiming') :
                 device.status === 'open' ? t('close') : t('open')}
              </span>
            </button>
            {isStaleTransition ? (
              <div className="mt-6 max-w-xs text-center">
                <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
                  {t('device_stale_transition')}
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => handleToggle('open')}
                    disabled={isCommandLoading}
                    className="px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    {t('open')}
                  </button>
                  <button
                    onClick={() => handleToggle('closed')}
                    disabled={isCommandLoading}
                    className="px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/20 transition-all disabled:opacity-50"
                  >
                    {t('close')}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-center mt-6 text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                {t('tap_to_command')}
              </p>
            )}
          </div>
        </div>

        {/* Details & Actions */}
        <div className="flex flex-col gap-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-xl">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><Settings2 className="w-4 h-4"/> {t('specifications')}</h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-2">
                <span className="text-slate-500 dark:text-slate-400">{t('owner')}</span>
                <span className="text-slate-900 dark:text-white font-medium max-w-[150px] truncate" title={device.owner_email}>{device.owner_email}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-2">
                <span className="text-slate-500 dark:text-slate-400">{t('last_seen')}</span>
                <span className="text-slate-900 dark:text-white">{new Date(device.last_seen_at).toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-2">
                <span className="text-slate-500 dark:text-slate-400">{t('my_access')}</span>
                <span className="capitalize text-slate-900 dark:text-white">{isOwner ? t('owner') : t('shared')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('pending_schedules')}</span>
                <span className="text-slate-900 dark:text-white">{schedules.filter(s => s.status === 'pending').length}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1">
            <button onClick={() => setShowScheduleModal(true)} className="p-4 rounded-3xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-600/10 dark:border-indigo-500/20 dark:hover:bg-indigo-600/20 transition-all flex flex-col items-center justify-center gap-2 text-indigo-600 dark:text-indigo-300">
              <Clock className="w-6 h-6" />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{t('schedules')}</span>
            </button>
            <button onClick={() => setShowShareModal(true)} className="p-4 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-2 text-slate-600 dark:text-slate-300 shadow-sm dark:shadow-none">
              <Users className="w-6 h-6" />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{t('device_sharing')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0f1219] border border-slate-200 dark:border-white/10 rounded-[32px] p-8 max-w-md w-full relative shadow-2xl">
            <button onClick={() => setShowScheduleModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"><X className="w-5 h-5"/></button>
            <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">{t('create_schedule')}</h3>
            
            <form onSubmit={handleScheduleSubmit}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase">{t('action')}</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setScheduleAction('open')} className={`flex-1 py-2 rounded-xl text-sm font-semibold border ${scheduleAction === 'open' ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/20 dark:border-emerald-500/50 dark:text-emerald-400' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-white/5 dark:border-white/10 dark:text-slate-400'}`}>{t('open')}</button>
                  <button type="button" onClick={() => setScheduleAction('closed')} className={`flex-1 py-2 rounded-xl text-sm font-semibold border ${scheduleAction === 'closed' ? 'bg-slate-100 border-slate-300 text-slate-800 dark:bg-slate-700 dark:border-slate-500 dark:text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-white/5 dark:border-white/10 dark:text-slate-400'}`}>{t('close')}</button>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase">{t('date')}</label>
                <input type="date" required value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="mb-8">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase">{t('time')}</label>
                <input type="time" required value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
              </div>
              
              <button type="submit" className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20">
                {t('save_schedule')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sharing Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0f1219] border border-slate-200 dark:border-white/10 rounded-[32px] p-8 max-w-md w-full relative shadow-2xl">
            <button onClick={() => setShowShareModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"><X className="w-5 h-5"/></button>
            <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">{t('device_sharing')}</h3>
            
            {isOwner ? (
              <form onSubmit={handleShareSubmit} className="mb-8">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase">{t('invite_email')}</label>
                <div className="flex gap-2">
                  <input type="email" required placeholder="user@example.com" value={shareEmail} onChange={e => setShareEmail(e.target.value)} className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 text-sm" />
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white rounded-xl text-sm font-semibold transition-all">{t('add')}</button>
                </div>
              </form>
            ) : (
              <div className="mb-8 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-sm text-slate-500 dark:text-slate-400">
                {t('only_owner_can_invite').replace('{}', device.owner_email)}
              </div>
            )}

            <div>
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase">{t('people_access')}</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                  <span className="text-sm text-slate-900 dark:text-white">{device.owner_email}</span>
                  <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 rounded border border-indigo-100 dark:border-transparent">{t('owner')}</span>
                </div>
                {device.shared_with.map(email => (
                  <div key={email} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                    <span className="text-sm truncate mr-2 text-slate-900 dark:text-white">{email}</span>
                    {isOwner ? (
                      <button onClick={() => handleRemoveShare(email)} className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">{t('remove')}</button>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400 rounded">{t('shared')}</span>
                    )}
                  </div>
                ))}
                {device.shared_with.length === 0 && <p className="text-sm text-slate-500 italic px-2">{t('not_shared')}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
