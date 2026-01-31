export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: number;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  priority?: number;
  due_date?: string;
}

export type Priority = 1 | 2 | 3; // 1 = Low, 2 = Medium, 3 = High

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface SyncStatus {
  last_sync_at: string | null;
  last_sync_status: string | null;
  is_syncing: boolean;
}
