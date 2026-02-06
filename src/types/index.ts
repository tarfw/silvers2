export interface Actor {
  id: string;
  parentid: string | null;
  actortype: 'user' | 'merchant' | 'driver' | 'provider' | 'org';
  globalcode: string;
  name: string;
  metadata?: string; // JSON string
  vector?: any;      // BLOB
}

export interface Collab {
  id: string;
  actorid: string;
  targettype: 'node' | 'point' | 'stream' | 'org';
  targetid: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  permissions?: string; // JSON string
  createdat: string;
  expiresat: string | null;
}

export interface Node {
  id: string;
  parentid: string | null;
  nodetype: 'product' | 'category' | 'collection' | 'optionset' | 'option' | 'vendor';
  universalcode: string;
  title: string;
  payload?: string;    // JSON string
  embedding?: any;     // BLOB
}

export interface Point {
  id: string;
  noderef: string;
  sellerid: string;
  sku: string;
  lat: number;
  lon: number;
  stock?: string;      // INT or JSON string
  price: number;
  notes?: string;
  version: number;
}

export interface Stream {
  id: string;
  scope: 'retail' | 'taxi' | 'food' | 'p2p';
  createdby: string;
  createdat: string;
}

export interface StreamCollab {
  streamid: string;
  actorid: string;
  role: string;
  joinedat: string | null;
}

export interface OrEvent {
  id: string;
  streamid: string;
  opcode: number;
  refid: string;
  lat?: number;
  lng?: number;
  delta: number;
  payload?: string;    // JSON string
  scope: 'retail' | 'taxi' | 'food' | 'p2p';
  status?: string;
  ts: string;
}

export interface SyncStatus {
  last_sync_at: string | null;
  last_sync_status: string | null;
  is_syncing: boolean;
}
