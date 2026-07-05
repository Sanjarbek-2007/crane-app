import { db, auth, functions } from './firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface AppDevice {
  id: string;
  serial_number: string;
  name: string;
  status: 'open' | 'closed' | 'offline';
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

export const subscribeToDevices = (email: string, uid: string, callback: (devices: AppDevice[]) => void) => {
  const q1 = query(collection(db, 'devices'), where('owner_uid', '==', uid));
  const q2 = query(collection(db, 'devices'), where('shared_with', 'array-contains', email));
  
  let d1: AppDevice[] = [];
  let d2: AppDevice[] = [];
  
  const merge = () => {
    const map = new Map();
    [...d1, ...d2].forEach(d => map.set(d.id, d));
    callback(Array.from(map.values()));
  };

  const unsub1 = onSnapshot(q1, (snap) => {
    d1 = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppDevice));
    merge();
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'devices');
  });
  
  const unsub2 = onSnapshot(q2, (snap) => {
    d2 = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppDevice));
    merge();
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'devices');
  });

  return () => { unsub1(); unsub2(); };
};

export const subscribeToLogs = (email: string, callback: (logs: AppLog[]) => void) => {
  const q = query(collection(db, 'logs'), where('related_emails', 'array-contains', email));
  return onSnapshot(q, (snap) => {
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppLog));
    logs.sort((a, b) => b.created_at - a.created_at);
    callback(logs);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'logs');
  });
};

export const subscribeToSchedules = (email: string, callback: (schedules: AppSchedule[]) => void) => {
  const q = query(collection(db, 'schedules'), where('related_emails', 'array-contains', email));
  return onSnapshot(q, (snap) => {
    const s = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppSchedule));
    s.sort((a, b) => a.scheduled_at - b.scheduled_at);
    callback(s);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'schedules');
  });
};

const claimDeviceCallable = httpsCallable<{ claimCode: string }, { deviceId: string; serial_number: string }>(functions, 'claimDeviceCallable');

export const claimDevice = async (claimCode: string, uid: string, email: string) => {
  // Verified server-side (Cloud Function claimDeviceCallable) against a
  // pre-provisioned device_secrets record created by provisionDevice.ts -
  // an arbitrary/unregistered code is rejected with a not-found error.
  await claimDeviceCallable({ claimCode });
};

export const toggleDevice = async (device: AppDevice, newStatus: 'open' | 'closed', userEmail: string) => {
  const deviceRef = doc(db, 'devices', device.id);
  await updateDoc(deviceRef, { status: newStatus, last_seen_at: Date.now() });

  const log: Omit<AppLog, 'id'> = {
    device_id: device.id,
    device_name: device.name,
    action: newStatus,
    source: 'manual',
    issued_by: userEmail,
    created_at: Date.now(),
    related_emails: [device.owner_email, ...device.shared_with]
  };
  await addDoc(collection(db, 'logs'), log);
};

export const addSchedule = async (device: AppDevice, action: 'open' | 'closed', dateMs: number, userEmail: string) => {
  const s: Omit<AppSchedule, 'id'> = {
    device_id: device.id,
    device_name: device.name,
    action,
    scheduled_at: dateMs,
    status: 'pending',
    created_by: userEmail,
    related_emails: [device.owner_email, ...device.shared_with]
  };
  await addDoc(collection(db, 'schedules'), s);
};

export const cancelSchedule = async (scheduleId: string) => {
  await deleteDoc(doc(db, 'schedules', scheduleId));
};

export const shareDevice = async (device: AppDevice, emailToShare: string) => {
  if (device.shared_with.includes(emailToShare)) return;
  const newShared = [...device.shared_with, emailToShare];
  await updateDoc(doc(db, 'devices', device.id), { shared_with: newShared });
  
  // Update existing logs and schedules for this device so the new user can see them
  // (In a real app, you might not backfill, but for simplicity we can or just let them see new ones).
  // It's simpler to just let them see new logs, or backfill by fetching and updating. Let's not backfill to keep it simple.
};

export const removeShare = async (device: AppDevice, emailToRemove: string) => {
  const newShared = device.shared_with.filter(e => e !== emailToRemove);
  await updateDoc(doc(db, 'devices', device.id), { shared_with: newShared });
};

// Scheduler Loop for frontend
export const executeDueSchedules = async (schedules: AppSchedule[], devices: AppDevice[]) => {
  const now = Date.now();
  for (const s of schedules) {
    if (s.status === 'pending' && s.scheduled_at <= now) {
      const device = devices.find(d => d.id === s.device_id);
      if (device) {
        // execute
        await updateDoc(doc(db, 'devices', device.id), { status: s.action, last_seen_at: now });
        
        const log: Omit<AppLog, 'id'> = {
          device_id: device.id,
          device_name: device.name,
          action: s.action,
          source: 'schedule',
          issued_by: s.created_by,
          created_at: now,
          related_emails: s.related_emails
        };
        await addDoc(collection(db, 'logs'), log);
      }
      await updateDoc(doc(db, 'schedules', s.id), { status: 'executed' });
    }
  }
};
