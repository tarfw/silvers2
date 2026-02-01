import { Database, getDbPath } from '@tursodatabase/sync-react-native';

const TURSO_URL = process.env.EXPO_PUBLIC_TURSO_URL || '';
const TURSO_TOKEN = process.env.EXPO_PUBLIC_TURSO_TOKEN || '';

if (!TURSO_URL || !TURSO_TOKEN) {
  console.warn('⚠️ Turso credentials not configured. Please set EXPO_PUBLIC_TURSO_URL and EXPO_PUBLIC_TURSO_TOKEN');
}

class DatabaseManager {
  private db: Database | null = null;
  private userId: string | null = null;

  async initialize(userId: string): Promise<Database> {
    this.userId = userId;
    const localDbName = `tasks_${userId}.db`;
    const dbPath = getDbPath(localDbName);

    try {
      console.log(`[${new Date().toLocaleTimeString('en-GB')}] 🔗 Turso DB connection initiated for user: ${userId}`);
      this.db = new Database({
        path: dbPath,
        url: TURSO_URL,
        authToken: TURSO_TOKEN,
      });

      console.log(`[${new Date().toLocaleTimeString('en-GB')}] 📡 Connecting to Turso...`);
      await this.db.connect();
      console.log(`[${new Date().toLocaleTimeString('en-GB')}] ✅ Connected to Turso`);

      console.log(`[${new Date().toLocaleTimeString('en-GB')}] 🛠️ Initializing schema...`);
      await this.initializeSchema();
      console.log(`[${new Date().toLocaleTimeString('en-GB')}] ✅ Schema initialized`);

      console.log(`[${new Date().toLocaleTimeString('en-GB')}] 🔄 Pulling data...`);
      await this.pull();
      console.log(`[${new Date().toLocaleTimeString('en-GB')}] ✅ Initial pull completed`);

      return this.db;
    } catch (error) {
      console.error(`[${new Date().toLocaleTimeString('en-GB')}] ❌ Database initialization failed:`, error);
      throw error;
    }
  }

  private async initializeSchema(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const statements = [
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        completed INTEGER DEFAULT 0,
        priority INTEGER DEFAULT 1,
        due_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)`,
      `CREATE TABLE IF NOT EXISTS sync_metadata (
        id INTEGER PRIMARY KEY,
        last_sync_at TEXT,
        last_sync_status TEXT
      )`
    ];

    for (const sql of statements) {
      try {
        console.log(`[${new Date().toLocaleTimeString('en-GB')}] 📝 Executing: ${sql.substring(0, 50)}...`);
        await this.db.exec(sql);
      } catch (error) {
        console.error(`[${new Date().toLocaleTimeString('en-GB')}] ❌ Statement failed:`, error);
        throw error;
      }
    }
    console.log(`[${new Date().toLocaleTimeString('en-GB')}] ✅ Schema initialization completed`);
  }

  async pull(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.pull();
      await this.updateSyncMetadata('pull', 'success');
      console.log('✅ Pull completed successfully');
    } catch (error) {
      await this.updateSyncMetadata('pull', 'error');
      console.error('❌ Pull failed:', error);
      throw error;
    }
  }

  async push(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.push();
      await this.updateSyncMetadata('push', 'success');
      console.log('✅ Push completed successfully');
    } catch (error) {
      await this.updateSyncMetadata('push', 'error');
      console.error('❌ Push failed:', error);
      throw error;
    }
  }

  async sync(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      console.log(`[${new Date().toLocaleTimeString('en-GB')}] 🔄 Starting full sync (pull + push)...`);
      await this.pull();
      await this.push();
      console.log(`[${new Date().toLocaleTimeString('en-GB')}] ✅ Full sync completed successfully`);
    } catch (error) {
      console.error(`[${new Date().toLocaleTimeString('en-GB')}] ❌ Sync failed:`, error);
      throw error;
    }
  }

  private async updateSyncMetadata(type: 'pull' | 'push' | 'sync', status: 'success' | 'error'): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.run(`
        INSERT INTO sync_metadata (id, last_sync_at, last_sync_status)
        VALUES (1, datetime('now'), ?)
        ON CONFLICT(id) DO UPDATE SET
          last_sync_at = datetime('now'),
          last_sync_status = ?
      `, [`${type}_${status}`, `${type}_${status}`]);
    } catch (e) {
      // Table might not exist yet, ignore
    }
  }

  getDatabase(): Database | null {
    return this.db;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.push(); // Push any pending changes before closing
      await this.db.close();
      this.db = null;
      this.userId = null;
    }
  }
}

export const databaseManager = new DatabaseManager();

// Type definitions for tasks
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
