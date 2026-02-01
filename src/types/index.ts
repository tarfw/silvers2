export interface Node {
  id: string;
  parentid: string | null;
  type: 'product' | 'service';
  unicode?: string;
  title: string;
  payload?: any;
  createdat: string;
}

export interface NodeInput {
  parentid?: string | null;
  type: 'product' | 'service';
  unicode?: string;
  title: string;
  payload?: any;
}

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
