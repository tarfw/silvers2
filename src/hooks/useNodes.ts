import { useCallback, useEffect, useState } from 'react';
import { databaseManager } from '../lib/database';
import { Node } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

export function useNodes() {
    const { user, db } = useAuth();
    const [nodes, setNodes] = useState<Node[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    // Load nodes from local database
    const loadNodes = useCallback(async () => {
        if (!db || !user) return;

        try {
            const rows = await db.all('SELECT * FROM nodes') as any[];
            const parsedNodes = rows.map(row => ({
                ...row,
                payload: row.payload ? JSON.parse(row.payload) : null
            }));
            setNodes(parsedNodes as Node[]);
        } catch (error) {
            console.error('Error loading nodes:', error);
        } finally {
            setIsLoading(false);
        }
    }, [db, user]);

    // Helper to verify parent exists
    const verifyParent = async (parentId: string | null): Promise<boolean> => {
        if (!parentId || !db) return true;
        try {
            const rows = await db.all('SELECT id FROM nodes WHERE id = ?', [parentId]);
            return rows.length > 0;
        } catch (e) {
            return false;
        }
    };

    // Initial load
    useEffect(() => {
        const init = async () => {
            if (db && user) {
                setIsLoading(true);
                try {
                    console.log('[useNodes] Initial pull starting...');
                    await databaseManager.pull();
                    console.log('[useNodes] Initial pull completed.');
                } catch (error) {
                    console.warn('[useNodes] Initial pull failed:', error);
                } finally {
                    await loadNodes();
                    setIsLoading(false);
                }
            }
        };
        init();
    }, [db, user, loadNodes]);

    // Create node
    const createNode = async (input: {
        nodetype: 'product' | 'category' | 'collection' | 'optionset' | 'option';
        universalcode: string;
        title: string;
        parentid?: string | null;
        payload?: any
    }): Promise<Node> => {
        if (!db || !user) throw new Error('Not authenticated');

        // Validate parent exists if provided
        if (input.parentid) {
            const exists = await verifyParent(input.parentid);
            if (!exists) throw new Error(`Parent node ID "${input.parentid}" not found locally. Pull updates first.`);
        }

        const node: Node = {
            id: uuidv4(),
            parentid: input.parentid || null,
            nodetype: input.nodetype,
            universalcode: input.universalcode,
            title: input.title,
            payload: input.payload ? JSON.stringify(input.payload) : undefined,
        };

        await db.run(`
            INSERT INTO nodes (id, parentid, nodetype, universalcode, title, payload)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            node.id,
            node.parentid,
            node.nodetype,
            node.universalcode,
            node.title,
            node.payload ?? null,
        ]);

        await loadNodes();
        return node;
    };

    // Update node
    const updateNode = async (id: string, updates: Partial<{
        nodetype: 'product' | 'category' | 'collection' | 'optionset' | 'option';
        universalcode: string;
        title: string;
        parentid: string | null;
        payload: any;
    }>): Promise<void> => {
        if (!db || !user) throw new Error('Not authenticated');

        // Validate parent exists if provided in updates
        if (updates.parentid) {
            const exists = await verifyParent(updates.parentid);
            if (!exists) throw new Error(`Parent node ID "${updates.parentid}" not found locally. Pull updates first.`);
        }

        const filteredUpdates: Record<string, any> = {};

        // Only include keys that are defined
        Object.keys(updates).forEach(key => {
            const value = (updates as any)[key];
            if (value !== undefined) {
                filteredUpdates[key] = key === 'payload' && value !== null
                    ? JSON.stringify(value)
                    : value;
            }
        });

        if (Object.keys(filteredUpdates).length === 0) return;

        const setClause = Object.keys(filteredUpdates)
            .map(key => `${key} = ?`)
            .join(', ');

        const values = Object.values(filteredUpdates);
        values.push(id);

        await db.run(`
            UPDATE nodes 
            SET ${setClause}
            WHERE id = ?
        `, values);

        await loadNodes();
    };

    // Delete node
    const deleteNode = async (id: string): Promise<void> => {
        if (!db || !user) throw new Error('Not authenticated');

        await db.run('DELETE FROM nodes WHERE id = ?', [id]);
        await loadNodes();
    };

    // Sync with cloud
    const sync = async (): Promise<void> => {
        if (!db) return;

        setIsSyncing(true);
        try {
            await databaseManager.sync();
            await loadNodes();
        } catch (error) {
            console.error('Sync failed:', error);
            throw error;
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
            await loadNodes();
        } catch (error) {
            console.error('Pull failed:', error);
            throw error;
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
        } catch (error) {
            console.error('Push failed:', error);
            throw error;
        } finally {
            setIsSyncing(false);
        }
    };

    return {
        nodes,
        isLoading,
        isSyncing,
        createNode,
        updateNode,
        deleteNode,
        sync,
        pull,
        push,
        refresh: loadNodes,
    };
}
