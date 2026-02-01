import { Database, getDbPath } from '@tursodatabase/sync-react-native';

const TURSO_URL = process.env.EXPO_PUBLIC_TURSO_URL || '';
const TURSO_TOKEN = process.env.EXPO_PUBLIC_TURSO_TOKEN || '';

if (!TURSO_URL || !TURSO_TOKEN) {
  console.warn('⚠️ Turso credentials not configured. Please set EXPO_PUBLIC_TURSO_URL and EXPO_PUBLIC_TURSO_TOKEN');
}

class DatabaseManager {
  private db: Database | null = null;
  private userId: string | null = null;
  private currentTenantId: string | null = null;
  private isInitializing: boolean = false;

  async initialize(tenantId: string, url: string, token: string, userId: string): Promise<Database> {
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

    // Don't re-initialize if already connected to the same tenant
    if (this.db && this.currentTenantId === tenantId && this.userId === userId) {
      console.log(`[${new Date().toLocaleTimeString('en-GB')}] ♻️ Database already initialized for this tenant.`);
      return this.db;
    }

    this.isInitializing = true;
    this.userId = userId;
    this.currentTenantId = tenantId;
    // Create a local database name per tenant
    const localDbName = `tenant_${tenantId}.db`;
    const dbPath = getDbPath(localDbName);

    try {
      console.log(`[${new Date().toLocaleTimeString('en-GB')}] 🔗 Turso DB connection initiated for tenant: ${tenantId}`);
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
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        created_by TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        completed INTEGER DEFAULT 0,
        priority INTEGER DEFAULT 1,
        due_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)`,
      `CREATE TABLE IF NOT EXISTS sync_metadata (
        id INTEGER PRIMARY KEY,
        last_sync_at TEXT,
        last_sync_status TEXT
      )`
    ];

    // Check for old schema and migrate if necessary
    try {
      const tableInfo = await this.db.all('PRAGMA table_info(tasks)') as any[];
      const hasOldColumn = tableInfo.some(col => col.name === 'user_id');
      if (hasOldColumn) {
        console.log(`[${new Date().toLocaleTimeString('en-GB')}] ⚠️ Old 'user_id' column found. Migrating to 'created_by'...`);
        // Simpler to drop and recreate for this migration phase to ensure clean state
        await this.db.exec('DROP TABLE IF EXISTS tasks');
        await this.db.exec('DROP INDEX IF EXISTS idx_tasks_user_id');
      }
    } catch (e) {
      // Table might not exist yet, ignore
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

// Task types are imported from src/types
