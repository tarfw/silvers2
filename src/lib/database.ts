import { Database, connect } from '@tursodatabase/sync-react-native';

const TURSO_URL = process.env.EXPO_PUBLIC_TURSO_URL || '';
const TURSO_TOKEN = process.env.EXPO_PUBLIC_TURSO_TOKEN || '';

if (!TURSO_URL || !TURSO_TOKEN) {
  console.warn('⚠️ Turso credentials not configured. Please set EXPO_PUBLIC_TURSO_URL and EXPO_PUBLIC_TURSO_TOKEN');
}

class DatabaseManager {
  private db: Database | null = null;
  private userId: string | null = null;
  private isInitialized: boolean = false;
  private initPromise: Promise<Database> | null = null;

  async initialize(userId: string, email: string, name: string = 'Self', url: string = TURSO_URL, token: string = TURSO_TOKEN): Promise<Database> {
    if (this.initPromise) {
      console.log(`[${new Date().toLocaleTimeString('en-GB')}] ⏳ Initialization already in progress... `);
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        this.userId = userId;
        const localDbName = `silvers_v8.db`;

        if (!this.db || !this.isInitialized) {
          console.log(`[${new Date().toLocaleTimeString('en-GB')}] 🔗 Turso DB connection initiated (v8)`);

          this.db = await connect({
            path: localDbName,
            url: url,
            authToken: token,
          });

          console.log(`[${new Date().toLocaleTimeString('en-GB')}] ✅ Connected to Turso`);
          await this.initializeSchema();
          this.isInitialized = true;
        }

        console.log(`[${new Date().toLocaleTimeString('en-GB')}] 👤 Ensuring self-actor exists... `);
        await this.db.run(`
          INSERT INTO actors (id, actortype, globalcode, name)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            globalcode = excluded.globalcode,
            name = excluded.name
        `, [userId, 'user', email, name]);

        return this.db;
      } catch (error) {
        console.error(`[${new Date().toLocaleTimeString('en-GB')}] ❌ Database initialization failed: `, error);
        this.initPromise = null;
        this.isInitialized = false;
        throw error;
      }
    })();

    return this.initPromise;
  }

  private getStatements(): string[] {
    return [
      `CREATE TABLE IF NOT EXISTS actors (
        id TEXT PRIMARY KEY,
        parentid TEXT,
        actortype TEXT NOT NULL,
        globalcode TEXT NOT NULL,
        name TEXT NOT NULL,
        metadata TEXT,
        vector BLOB
      )`,
      `CREATE TABLE IF NOT EXISTS collab (
        id TEXT PRIMARY KEY,
        actorid TEXT NOT NULL,
        targettype TEXT NOT NULL,
        targetid TEXT NOT NULL,
        role TEXT NOT NULL,
        permissions TEXT,
        createdat TEXT NOT NULL,
        expiresat TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        parentid TEXT,
        nodetype TEXT NOT NULL,
        universalcode TEXT NOT NULL,
        title TEXT NOT NULL,
        payload TEXT,
        embedding BLOB
      )`,
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
        version INTEGER DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS streams (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        createdby TEXT NOT NULL,
        createdat TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS streamcollab (
        streamid TEXT NOT NULL,
        actorid TEXT NOT NULL,
        role TEXT NOT NULL,
        joinedat TEXT,
        PRIMARY KEY (streamid, actorid)
      )`,
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
        ts TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS sync_metadata (
        id INTEGER PRIMARY KEY,
        last_sync_at TEXT,
        last_sync_status TEXT
      )`
    ];
  }

  private async initializeSchema(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Disable foreign keys to solve the sync order conflict simply
    await this.db.exec('PRAGMA foreign_keys = OFF;');

    const statements = this.getStatements();
    console.log(`[${new Date().toLocaleTimeString('en-GB')}] 📝 Initializing schema...`);

    for (const sql of statements) {
      try {
        await this.db.exec(sql);
      } catch (error) {
        console.error(`[${new Date().toLocaleTimeString('en-GB')}] ❌ Statement failed: `, error);
        throw error;
      }
    }
    console.log(`[${new Date().toLocaleTimeString('en-GB')}] ✅ Schema initialized`);
  }

  async pull(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.withRetry(() => this.db!.pull(), 'Pull');
    await this.updateSyncMetadata('pull', 'success');
  }

  async push(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.withRetry(() => this.db!.push(), 'Push');
    await this.updateSyncMetadata('push', 'success');
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
        delay *= 2;
      }
    }
    throw new Error(`${label} failed after ${maxRetries} attempts`);
  }

  async sync(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    try {
      console.log(`[${new Date().toLocaleTimeString('en-GB')}] 🔄 Starting full sync... `);
      await this.pull();
      await this.push();
      console.log(`[${new Date().toLocaleTimeString('en-GB')}] ✅ Sync completed`);
    } catch (error) {
      console.error(`[${new Date().toLocaleTimeString('en-GB')}] ❌ Sync failed: `, error);
      throw error;
    }
  }

  private async updateSyncMetadata(type: string, status: string): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.run(`
        INSERT INTO sync_metadata(id, last_sync_at, last_sync_status)
        VALUES(1, datetime('now'), ?)
        ON CONFLICT(id) DO UPDATE SET
          last_sync_at = datetime('now'),
          last_sync_status = excluded.last_sync_status
      `, [`${type}_${status}`]);
    } catch (e) {
      // Ignore
    }
  }

  getDatabase(): Database | null {
    return this.db;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.push().catch(() => { });
      await this.db.close();
      this.db = null;
      this.userId = null;
      this.initPromise = null;
      this.isInitialized = false;
    }
  }
}

export const databaseManager = new DatabaseManager();
