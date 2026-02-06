import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useNodes } from '../hooks/useNodes';
import { generateShortId } from '../lib/utils';

const Colors = {
    background: '#FFFFFF',
    text: '#000000',
    textSecondary: '#636366',
    primary: '#000000',
    separator: '#F2F2F7',
    surface: '#F9F9FB',
    accent: '#007AFF',
};

interface InventoryItem {
    id: string; // point id
    nodeId: string;
    title: string;
    sku: string;
    stock: number;
    price: number;
}

export function InventoryScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { db, user } = useAuth();
    const { nodes } = useNodes();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [newStock, setNewStock] = useState('');

    const loadInventory = useCallback(async () => {
        if (!db || !user) return;
        setIsLoading(true);

        try {
            // Get all points and join with nodes to get names
            const points = await db.all(`
                SELECT p.*, n.title 
                FROM points p
                JOIN nodes n ON p.noderef = n.id
            `) as any[];

            setInventory(points.map(p => ({
                id: p.id,
                nodeId: p.noderef,
                title: p.title,
                sku: p.sku || 'No SKU',
                stock: parseInt(p.stock || '0'),
                price: p.price || 0
            })));
        } catch (error) {
            console.error('Error loading inventory:', error);
        } finally {
            setIsLoading(false);
        }
    }, [db, user]);

    useFocusEffect(
        useCallback(() => {
            loadInventory();
        }, [loadInventory])
    );

    const handleUpdateStock = async () => {
        if (!db || !user || !editingItem) return;
        const stockValue = parseInt(newStock);
        if (isNaN(stockValue)) {
            Alert.alert('Error', 'Please enter a valid number');
            return;
        }

        try {
            // 1. Update points table
            await db.run(`UPDATE points SET stock = ? WHERE id = ?`, [stockValue.toString(), editingItem.id]);

            // 2. Ensure stream context exists for this product
            await db.run(`
                INSERT INTO streams (id, scope, createdby, createdat)
                SELECT ?, ?, ?, ?
                WHERE NOT EXISTS (SELECT 1 FROM streams WHERE id = ?)
            `, [editingItem.nodeId, 'product', user.id, new Date().toISOString(), editingItem.nodeId]);

            // 3. Record adjustment in ledger (opcode 601)
            const diff = stockValue - editingItem.stock;
            if (diff !== 0) {
                await db.run(`
                    INSERT INTO orevents (id, streamid, opcode, refid, delta, payload, scope, ts)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    generateShortId(),
                    editingItem.nodeId, // Using node ID as stream context for inventory
                    601, // Stock Adjustment
                    user.id,
                    diff,
                    JSON.stringify({ reason: 'Manual adjustment', oldStock: editingItem.stock, newStock: stockValue }),
                    'inventory',
                    new Date().toISOString()
                ]);
            }

            Alert.alert('Success', 'Stock updated');
            setEditingItem(null);
            loadInventory();
        } catch (error) {
            console.error('Update error:', error);
            Alert.alert('Error', 'Failed to update stock');
        }
    };

    const renderItem = ({ item }: { item: InventoryItem }) => (
        <TouchableOpacity style={styles.card} onPress={() => {
            setEditingItem(item);
            setNewStock(item.stock.toString());
        }}>
            <View style={styles.cardHeader}>
                <View style={styles.mainInfo}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemSku}>SKU: {item.sku}</Text>
                </View>
                <View style={styles.stockBadge}>
                    <Text style={styles.stockLabel}>STOCK</Text>
                    <Text style={styles.stockValue}>{item.stock}</Text>
                </View>
            </View>
            <View style={styles.cardFooter}>
                <Text style={styles.priceText}>${item.price.toFixed(2)}</Text>
                <Ionicons name="create-outline" size={18} color={Colors.accent} />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { letterSpacing: -1 }]}>Inventory</Text>
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={Colors.primary} />
                </View>
            ) : inventory.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="cube-outline" size={64} color="#D1D1D6" />
                    <Text style={styles.emptyTitle}>No SKUs found</Text>
                    <Text style={styles.emptySubtitle}>Add points to your products to see them here</Text>
                </View>
            ) : (
                <FlatList
                    data={inventory}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <Modal
                visible={!!editingItem}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setEditingItem(null)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Stock</Text>
                        <Text style={styles.modalSubtitle}>{editingItem?.title}</Text>

                        <TextInput
                            style={styles.input}
                            value={newStock}
                            onChangeText={setNewStock}
                            keyboardType="numeric"
                            autoFocus
                            placeholder="Enter new stock quantity"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setEditingItem(null)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleUpdateStock}
                            >
                                <Text style={styles.saveButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
    },
    backButton: {
        marginRight: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
    },
    emptySubtitle: {
        marginTop: 8,
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    mainInfo: {
        flex: 1,
        marginRight: 12,
    },
    itemTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
    },
    itemSku: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    stockBadge: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignItems: 'center',
        minWidth: 60,
    },
    stockLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    stockValue: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.text,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.separator,
    },
    priceText: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 15,
        color: Colors.textSecondary,
        marginBottom: 24,
    },
    input: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        height: 56,
        paddingHorizontal: 16,
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: Colors.surface,
    },
    saveButton: {
        backgroundColor: Colors.primary,
    },
    cancelButtonText: {
        color: Colors.text,
        fontWeight: '600',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
});
