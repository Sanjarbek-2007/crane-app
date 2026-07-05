import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { AppDevice, AppLog, AppSchedule, subscribeToDevices, subscribeToLogs, subscribeToSchedules } from '../lib/db';

export function useAppData() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<AppDevice[]>([]);
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [schedules, setSchedules] = useState<AppSchedule[]>([]);

  useEffect(() => {
    if (!user || !user.email) return;

    // Due schedules are executed server-side by the backend's scheduler now
    // (runs continuously regardless of whether any browser tab is open),
    // so this hook only needs to poll for the current state.
    const unsubDevices = subscribeToDevices(user.email, user.uid, setDevices);
    const unsubLogs = subscribeToLogs(user.email, setLogs);
    const unsubSchedules = subscribeToSchedules(user.email, setSchedules);

    return () => {
      unsubDevices();
      unsubLogs();
      unsubSchedules();
    };
  }, [user]);

  return { devices, logs, schedules };
}
