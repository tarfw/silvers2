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
  private isInitialized: boolean = false;

  async initialize(userId: string, email: string, name: string = 'Self', url: string = TURSO_URL, token: string = TURSO_TOKEN): Promise<Database> {
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

    this.isInitializing = true;
    this.userId = userId;

    // Use a fixed local database name - v4 to ensure clean start after schema changes
    const localDbName = `silvers_v4.db`;
    const dbPath = getDbPath(localDbName);

    try {
      if (!this.db || !this.isInitialized) {
        console.log(`[${new Date().toLocaleTimeString('en-GB')}] 🔗 Turso DB connection initiated (v4)`);
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
        this.isInitialized = true;
        console.log(`[${new Date().toLocaleTimeString('en-GB')}] ✅ Schema initialized`);
      }

      // Ensure self-actor exists and is up to date
      console.log(`[${new Date().toLocaleTimeString('en-GB')}] 👤 Ensuring self-actor exists...`);
      await this.db.run(`
        INSERT INTO actors (id, actortype, globalcode, name)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          globalcode = excluded.globalcode,
          name = excluded.name
      `, [userId, 'user', email, name]);

      // Add a small delay to let schema changes "settle" before sync starts
      await new Promise(resolve => setTimeout(resolve, 1000));

      return this.db;
    } catch (error) {
      console.error(`[${new Date().toLocaleTimeString('en-GB')}] ❌ Database initialization failed:`, error);
      this.db = null; // Reset on failure
      this.isInitialized = false;
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  private async initializeSchema(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      console.log(`[${new Date().toLocaleTimeString('en-GB')}] 🔑 Enabling foreign keys...`);
      await this.db.exec('PRAGMA foreign_keys = ON;');
      console.log(`[${new Date().toLocaleTimeString('en-GB')}] ✅ Foreign keys enabled`);
    } catch (e) {
      console.warn(`[${new Date().toLocaleTimeString('en-GB')}] ⚠️ PRAGMA foreign_keys failed:`, e);
    }

    const statements = [
      // ACTORS: Identity Layer
      `CREATE TABLE IF NOT EXISTS actors (
        id TEXT PRIMARY KEY,
        parentid TEXT,
        actortype TEXT NOT NULL,
        globalcode TEXT NOT NULL,
        name TEXT NOT NULL,
        metadata TEXT,
        vector BLOB,
        FOREIGN KEY (parentid) REFERENCES actors(id)
      )`,
      // COLLAB: Authorization / Collaboration
      `CREATE TABLE IF NOT EXISTS collab (
        id TEXT PRIMARY KEY,
        actorid TEXT NOT NULL,
        targettype TEXT NOT NULL,
        targetid TEXT NOT NULL,
        role TEXT NOT NULL,
        permissions TEXT,
        createdat TEXT NOT NULL,
        expiresat TEXT,
        FOREIGN KEY (actorid) REFERENCES actors(id)
      )`,
      // NODES: Global Meaning Layer
      `CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        parentid TEXT,
        nodetype TEXT NOT NULL,
        universalcode TEXT NOT NULL,
        title TEXT NOT NULL,
        payload TEXT,
        embedding BLOB,
        FOREIGN KEY (parentid) REFERENCES nodes(id)
      )`,
      // POINTS: Local Availability Layer
      `CREATE TABLE IF NOT EXISTS points (
        id TEXT PRIMARY KEY,
        noderef TEXT NOT NULL,
        sellerid TEXT NOT NULL,
        sku TEXT NOT NULL,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        stock TEXT,
        price REAL NOT NULL,
        notes TEXT,
        version INTEGER DEFAULT 0,
        FOREIGN KEY (noderef) REFERENCES nodes(id),
        FOREIGN KEY (sellerid) REFERENCES actors(id)
      )`,
      // STREAMS: OR Envelope
      `CREATE TABLE IF NOT EXISTS streams (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        createdby TEXT NOT NULL,
        createdat TEXT NOT NULL
      )`,
      // STREAM PARTICIPANTS: P2P Membership
      `CREATE TABLE IF NOT EXISTS streamcollab (
        streamid TEXT NOT NULL,
        actorid TEXT NOT NULL,
        role TEXT NOT NULL,
        joinedat TEXT,
        PRIMARY KEY (streamid, actorid),
        FOREIGN KEY (streamid) REFERENCES streams(id),
        FOREIGN KEY (actorid) REFERENCES actors(id)
      )`,
      // OR EVENTS: Operational Ledger
      `CREATE TABLE IF NOT EXISTS orevents (
        id TEXT PRIMARY KEY,
        streamid TEXT NOT NULL,
        opcode INTEGER NOT NULL,
        refid TEXT NOT NULL,
        lat REAL,
        lng REAL,
        delta REAL DEFAULT 0,
        payload TEXT,
        scope TEXT NOT NULL,
        status TEXT,
        ts TEXT NOT NULL,
        FOREIGN KEY (streamid) REFERENCES streams(id)
      )`,
      // SYNC METADATA
      `CREATE TABLE IF NOT EXISTS sync_metadata (
        id INTEGER PRIMARY KEY,
        last_sync_at TEXT,
        last_sync_status TEXT
      )`
    ];

    console.log(`[${new Date().toLocaleTimeString('en-GB')}] 📝 Creating tables...`);
    for (const sql of statements) {
      try {
        const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
        console.log(`[${new Date().toLocaleTimeString('en-GB')}] 📝 Creating table: ${tableName}`);
        await this.db.exec(sql);
        console.log(`[${new Date().toLocaleTimeString('en-GB')}] ✅ Created table: ${tableName}`);
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
