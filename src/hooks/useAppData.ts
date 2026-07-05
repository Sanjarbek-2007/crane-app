import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { AppDevice, AppLog, AppSchedule, subscribeToDevices, subscribeToLogs, subscribeToSchedules, executeDueSchedules } from '../lib/db';

export function useAppData() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<AppDevice[]>([]);
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [schedules, setSchedules] = useState<AppSchedule[]>([]);

  useEffect(() => {
    if (!user || !user.email) return;
    
    const unsubDevices = subscribeToDevices(user.email, user.uid, setDevices);
    const unsubLogs = subscribeToLogs(user.email, setLogs);
    const unsubSchedules = subscribeToSchedules(user.email, setSchedules);

    return () => {
      unsubDevices();
      unsubLogs();
      unsubSchedules();
    };
  }, [user]);

  // Frontend cron job to execute due schedules
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (schedules.length > 0 && devices.length > 0) {
        executeDueSchedules(schedules, devices);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [schedules, devices, user]);

  return { devices, logs, schedules };
}
