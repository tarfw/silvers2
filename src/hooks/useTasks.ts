import { useCallback, useEffect, useState } from 'react';
import { databaseManager } from '../lib/database';
import { Task, TaskInput } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const db = databaseManager.getDatabase();

  // Load tasks from local database (Collaborative: Load all tasks in the tenant DB)
  const loadTasks = useCallback(async () => {
    if (!db || !user) return;

    try {
      // Each tenant has its own DB, so we select all tasks to collaborate
      const rows = await db.all('SELECT * FROM tasks ORDER BY created_at DESC');
      setTasks(rows as unknown as Task[]);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [db, user]);

  // Initial load
  useEffect(() => {
    if (db && user) {
      loadTasks();
    }
  }, [db, user, loadTasks]);

  // Create task
  const createTask = async (input: TaskInput): Promise<Task> => {
    if (!db || !user) throw new Error('Not authenticated');

    const task: Task = {
      id: uuidv4(),
      created_by: user.id,
      title: input.title,
      description: input.description,
      completed: false,
      priority: input.priority || 1,
      due_date: input.due_date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.run(`
      INSERT INTO tasks (id, created_by, title, description, completed, priority, due_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      task.id,
      task.created_by,
      task.title,
      task.description ?? null,
      task.completed ? 1 : 0,
      task.priority,
      task.due_date ?? null,
      task.created_at,
      task.updated_at,
    ]);

    setTasks(prev => [task, ...prev]);
    return task;
  };

  // Update task
  const updateTask = async (id: string, updates: Partial<TaskInput>): Promise<void> => {
    if (!db || !user) throw new Error('Not authenticated');

    const setClause = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');

    const values = Object.values(updates);
    values.push(new Date().toISOString()); // updated_at
    values.push(id);

    await db.run(`
      UPDATE tasks 
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `, values);

    await loadTasks();
  };

  // Toggle completion
  const toggleTask = async (id: string): Promise<void> => {
    if (!db || !user) throw new Error('Not authenticated');

    await db.run(`
      UPDATE tasks 
      SET completed = CASE WHEN completed = 1 THEN 0 ELSE 1 END, updated_at = ?
      WHERE id = ?
    `, [new Date().toISOString(), id]);

    await loadTasks();
  };

  // Delete task
  const deleteTask = async (id: string): Promise<void> => {
    if (!db || !user) throw new Error('Not authenticated');

    await db.run('DELETE FROM tasks WHERE id = ?', [id]);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Sync with cloud
  const sync = async (): Promise<void> => {
    if (!db) return;

    setIsSyncing(true);
    try {
      await databaseManager.sync();
      await loadTasks(); // Reload after sync
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull from cloud
  const pull = async (): Promise<void> => {
    if (!db) return;

    setIsSyncing(true);
    try {
      await databaseManager.pull();
      await loadTasks();
    } finally {
      setIsSyncing(false);
    }
  };

  // Push to cloud
  const push = async (): Promise<void> => {
    if (!db) return;

    setIsSyncing(true);
    try {
      await databaseManager.push();
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    tasks,
    isLoading,
    isSyncing,
    createTask,
    updateTask,
    toggleTask,
    deleteTask,
    sync,
    pull,
    push,
    refresh: loadTasks,
  };
}
