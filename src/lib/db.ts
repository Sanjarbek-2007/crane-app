import { api } from './api';

const POLL_INTERVAL_MS = 4000;

export interface AppDevice {
  id: string;
  serial_number: string;
  name: string;
  // status is device-CONFIRMED (only ever set by the device itself calling
  // back through /device/sync) - 'opening'/'closing' while a move is
  // actually in progress, 'open'/'closed' only once the device reports it
  // actually finished. desired_status is just the last command a user (or
  // a schedule) asked for - it's optimistic and may not have happened yet.
  status: 'open' | 'closed' | 'opening' | 'closing' | 'offline';
  desired_status: 'open' | 'closed';
  last_seen_at: number;
  owner_uid: string;
  owner_email: string;
  shared_with: string[];
}

export interface AppLog {
  id: string;
  device_id: string;
  device_name: string;
  action: 'open' | 'closed';
  source: 'manual' | 'schedule';
  issued_by: string;
  created_at: number;
  related_emails: string[];
}

export interface AppSchedule {
  id: string;
  device_id: string;
  device_name: string;
  action: 'open' | 'closed';
  scheduled_at: number;
  status: 'pending' | 'executed';
  created_by: string;
  related_emails: string[];
}

// The backend is a plain REST API (no realtime push), so "subscribing" here
// means polling on an interval. Each function does an immediate fetch plus
// a poll loop, and returns an unsubscribe function that stops it.
function poll<T>(fetcher: () => Promise<T[]>, callback: (items: T[]) => void): () => void {
  let cancelled = false;

  const tick = async () => {
    try {
      const items = await fetcher();
      if (!cancelled) callback(items);
    } catch (error) {
      console.error('poll failed:', error);
    }
  };

  tick();
  const interval = setInterval(tick, POLL_INTERVAL_MS);
  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}

export const subscribeToDevices = (email: string, uid: string, callback: (devices: AppDevice[]) => void) => {
  return poll(() => api.get<AppDevice[]>('/api/devices'), callback);
};

export const subscribeToLogs = (email: string, callback: (logs: AppLog[]) => void) => {
  return poll(() => api.get<AppLog[]>('/api/logs'), callback);
};

export const subscribeToSchedules = (email: string, callback: (schedules: AppSchedule[]) => void) => {
  return poll(() => api.get<AppSchedule[]>('/api/schedules'), callback);
};

export const claimDevice = async (claimCode: string, uid: string, email: string) => {
  // Verified server-side against a pre-provisioned device_secrets record
  // created by the provisionDevice script - an arbitrary/unregistered code
  // is rejected with a 404.
  await api.post('/api/devices/claim', { claimCode });
};

export const toggleDevice = async (device: AppDevice, newStatus: 'open' | 'closed', userEmail: string) => {
  await api.patch(`/api/devices/${device.id}`, { status: newStatus });
};

export const addSchedule = async (device: AppDevice, action: 'open' | 'closed', dateMs: number, userEmail: string) => {
  await api.post('/api/schedules', { device_id: device.id, action, scheduled_at: dateMs });
};

export const cancelSchedule = async (scheduleId: string) => {
  await api.delete(`/api/schedules/${scheduleId}`);
};

export const shareDevice = async (device: AppDevice, emailToShare: string) => {
  if (device.shared_with.includes(emailToShare)) return;
  await api.post(`/api/devices/${device.id}/share`, { email: emailToShare });
};

export const removeShare = async (device: AppDevice, emailToRemove: string) => {
  await api.delete(`/api/devices/${device.id}/share`, { email: emailToRemove });
};
