import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useTranslation } from './i18n';

type ToastType = 'error' | 'success' | 'info';

interface ToastData {
  id: number;
  message: string;
  type: ToastType;
}

interface ConfirmState {
  message: string;
  resolve: (value: boolean) => void;
}

interface NotificationContextType {
  notify: (message: string, type?: ToastType) => void;
  confirmDialog: (message: string) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType>({
  notify: () => {},
  confirmDialog: async () => false,
});

// Replaces window.alert()/window.confirm() everywhere in the app with
// styled, translated, dismissable UI instead of a native browser dialog.
export const useNotify = () => useContext(NotificationContext);

let toastIdCounter = 0;
const TOAST_LIFETIME_MS = 5000;

const TOAST_STYLES: Record<ToastType, { icon: React.ReactNode; border: string }> = {
  error: {
    icon: <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0" />,
    border: 'border-red-200 dark:border-red-500/20',
  },
  success: {
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" />,
    border: 'border-emerald-200 dark:border-emerald-500/20',
  },
  info: {
    icon: <Info className="w-5 h-5 text-indigo-500 dark:text-indigo-400 shrink-0" />,
    border: 'border-indigo-200 dark:border-indigo-500/20',
  },
};

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const { icon, border } = TOAST_STYLES[toast.type];

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl bg-white dark:bg-[#0f1219] border shadow-xl backdrop-blur-xl transition-all duration-300 ${border} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      {icon}
      <p className="text-sm text-slate-700 dark:text-slate-200 flex-1">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const { t } = useTranslation();

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => dismissToast(id), TOAST_LIFETIME_MS);
  }, [dismissToast]);

  const confirmDialog = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => setConfirmState({ message, resolve }));
  }, []);

  const resolveConfirm = (result: boolean) => {
    confirmState?.resolve(result);
    setConfirmState(null);
  };

  return (
    <NotificationContext.Provider value={{ notify, confirmDialog }}>
      {children}

      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
        ))}
      </div>

      {confirmState && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0f1219] border border-slate-200 dark:border-white/10 rounded-[32px] p-8 max-w-sm w-full shadow-2xl">
            <p className="text-slate-900 dark:text-white text-base mb-8">{confirmState.message}</p>
            <div className="flex gap-4">
              <button
                onClick={() => resolveConfirm(false)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-sm font-medium transition-all text-slate-700 dark:text-slate-300"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => resolveConfirm(true)}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-red-500/20"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}
