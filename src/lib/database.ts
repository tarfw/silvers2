import { Database, getDbPath } from '@tursodatabase/sync-react-native';

const TURSO_URL = process.env.EXPO_PUBLIC_TURSO_URL || '';
const TURSO_TOKEN = process.env.EXPO_PUBLIC_TURSO_TOKEN || '';

if (!TURSO_URL || !TURSO_TOKEN) {
  console.warn('⚠️ Turso credentials not configured. Please set EXPO_PUBLIC_TURSO_URL and EXPO_PUBLIC_TURSO_TOKEN');
}

class DatabaseManager {
  private db: Database | null = null;
  private userId: string | null = null;
  private isInitializing: boolean = false;

  async initialize(userId: string, url: string = TURSO_URL, token: string = TURSO_TOKEN): Promise<Database> {
    // Prevent parallel initializations
    if (this.isInitializing) {
      console.log(`[${new Date().toLocaleTimeString('en-GB')}] ⏳ Initialization already in progress, skipping...`);
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (!this.isInitializing && this.db) {
            clearInterval(check);
            resolve(this.db);
          }
        }, 100);
      });
    }

    // Don't re-initialize if already connected
    if (this.db && this.userId === userId) {
      console.log(`[${new Date().toLocaleTimeString('en-GB')}] ♻️ Database already initialized.`);
      return this.db;
    }

    this.isInitializing = true;
    this.userId = userId;
    // Use a fixed local database name
    const localDbName = `silvers.db`;
    const dbPath = getDbPath(localDbName);

    try {
      console.log(`[${new Date().toLocaleTimeString('en-GB')}] 🔗 Turso DB connection initiated`);
      this.db = new Database({
        path: dbPath,
        url: url,
        authToken: token,
      });

      console.log(`[${new Date().toLocaleTimeString('en-GB')}] 📡 Connecting to Turso...`);
      await this.db.connect();
      console.log(`[${new Date().toLocaleTimeString('en-GB')}] ✅ Connected to Turso`);

      console.log(`[${new Date().toLocaleTimeString('en-GB')}] 🛠️ Initializing schema...`);
      await this.initializeSchema();
      console.log(`[${new Date().toLocaleTimeString('en-GB')}] ✅ Schema initialized`);

      // Add a small delay to let schema changes "settle" before sync starts
      await new Promise(resolve => setTimeout(resolve, 1000));

      return this.db;
    } catch (error) {
      console.error(`[${new Date().toLocaleTimeString('en-GB')}] ❌ Database initialization failed:`, error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  private async initializeSchema(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const statements = [
      `CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        parentid TEXT,
        type TEXT NOT NULL,
        unicode TEXT UNIQUE,
        title TEXT NOT NULL,
        payload JSON, 
        createdat DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parentid) REFERENCES nodes (id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_nodes_parentid ON nodes(parentid)`,
      `CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type)`,
      `CREATE TABLE IF NOT EXISTS sync_metadata (
        id INTEGER PRIMARY KEY,
        last_sync_at TEXT,
        last_sync_status TEXT
      )`
    ];

    // Clean up old tasks table if it exists
    try {
      await this.db.exec('DROP TABLE IF EXISTS tasks');
      await this.db.exec('DROP INDEX IF EXISTS idx_tasks_created_by');
      await this.db.exec('DROP INDEX IF EXISTS idx_tasks_completed');
      await this.db.exec('DROP INDEX IF EXISTS idx_tasks_due_date');
    } catch (e) {
      // Ignore errors during cleanup
    }

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

    await this.withRetry(async () => {
      await this.db!.pull();
      await this.updateSyncMetadata('pull', 'success');
      console.log('✅ Pull completed successfully');
    }, 'Pull');
  }

  async push(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.withRetry(async () => {
      await this.db!.push();
      await this.updateSyncMetadata('push', 'success');
      console.log('✅ Push completed successfully');
    }, 'Push');
  }

  private async withRetry<T>(fn: () => Promise<T>, label: string, maxRetries = 3): Promise<T> {
    let delay = 1000;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        const isTransient = error?.message?.includes('500') || error?.message?.includes('busy');
        if (i === maxRetries - 1 || !isTransient) throw error;

        console.warn(`[${new Date().toLocaleTimeString('en-GB')}] 🕒 ${label} failed (attempt ${i + 1}/${maxRetries}). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
    throw new Error(`${label} failed after ${maxRetries} attempts`);
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
      await this.push().catch(() => { }); // Attempt push but don't block on error
      await this.db.close();
      this.db = null;
      this.userId = null;
    }
  }
}

export const databaseManager = new DatabaseManager();

// Task types are imported from src/types
