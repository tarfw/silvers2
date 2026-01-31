-- Initialize Turso Database Schema for Tasks App
-- Run this in your Turso database shell: turso db shell tar-tarapp

-- Create tasks table with user isolation
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 1,
  due_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

-- Create sync metadata table to track last sync
CREATE TABLE IF NOT EXISTS sync_metadata (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_sync_at TEXT,
  last_sync_status TEXT
);

-- Insert default sync metadata
INSERT OR IGNORE INTO sync_metadata (id, last_sync_at, last_sync_status) 
VALUES (1, NULL, 'initialized');

-- Verify tables created
.tables

-- Check schema
.schema tasks
.schema sync_metadata