export type PermissionLevel = 'owner' | 'operator' | 'viewer';

export interface User {
  id: string;
  email: string;
}

export interface Device {
  id: string;
  serial_number: string;
  name: string;
  status: 'open' | 'closed' | 'unknown' | 'offline';
  last_seen_at: string;
  permission_level?: PermissionLevel;
}

export interface Schedule {
  id: string;
  device_id: string;
  action: 'open' | 'closed';
  scheduled_at: string;
  repeat_rule?: string;
  status: 'pending' | 'executed' | 'cancelled' | 'failed';
}

export interface CommandLog {
  id: string;
  action: 'open' | 'closed';
  source: 'manual' | 'schedule';
  result: 'success' | 'failed' | 'timeout';
  created_at: string;
}
