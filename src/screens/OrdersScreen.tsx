import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

const Colors = {
    background: '#FFFFFF',
    text: '#000000',
    textSecondary: '#636366',
    primary: '#000000',
    separator: '#F2F2F7',
    surface: '#F9F9FB',
    success: '#34C759',
};

interface OrderStream {
    id: string;
    createdat: string;
    itemCount: number;
    totalQty: number;
    statusOpcode: number;
    creatorName: string;
    creatorEmail: string;
}

const STATUS_MAP: Record<number, { label: string; color: string; bgColor: string }> = {
    501: { label: 'Placed', color: '#636366', bgColor: '#F2F2F7' },
    502: { label: 'Paid', color: '#007AFF', bgColor: '#E3F2FD' },
    503: { label: 'Shipped', color: '#FF9500', bgColor: '#FFF3E0' },
    504: { label: 'Delivered', color: '#34C759', bgColor: '#E8F5E9' },
    505: { label: 'Cancelled', color: '#FF3B30', bgColor: '#FFEBEE' },
};

export function OrdersScreen() {
    const navigation = useNavigation();
    const { db, user } = useAuth();
    const [orders, setOrders] = useState<OrderStream[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadOrders = useCallback(async () => {
        if (!db || !user) return;
        setIsLoading(true);

        try {
            // 1. Get all order streams for this user (where they are participants)
            // Join with actors to get the creator's details
            const streams = await db.all(`
                SELECT s.id, s.createdat, a.name as creatorName, a.globalcode as creatorEmail
                FROM streams s
                JOIN streamcollab sc ON s.id = sc.streamid
                LEFT JOIN actors a ON s.createdby = a.id
                WHERE s.scope = 'order' AND sc.actorid = ?
                ORDER BY s.createdat DESC
            `, [user.id]) as any[];

            const orderData: OrderStream[] = [];

            // 2. For each stream, summarize the items and get latest status
            for (const stream of streams) {
                const events = await db.all(`
                    SELECT 
                        (SELECT COUNT(*) FROM orevents WHERE streamid = ? AND opcode = 501) as itemCount,
                        (SELECT SUM(delta) FROM orevents WHERE streamid = ? AND opcode = 501) as totalQty,
                        (SELECT opcode FROM orevents WHERE streamid = ? AND opcode BETWEEN 501 AND 505 ORDER BY ts DESC LIMIT 1) as statusOpcode
                `, [stream.id, stream.id, stream.id]) as any[];

                orderData.push({
                    id: stream.id,
                    createdat: stream.createdat,
                    itemCount: events[0]?.itemCount || 0,
                    totalQty: events[0]?.totalQty || 0,
                    statusOpcode: events[0]?.statusOpcode || 501,
                    creatorName: stream.creatorName || 'Unknown',
                    creatorEmail: stream.creatorEmail || ''
                });
            }

            setOrders(orderData);
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setIsLoading(false);
        }
    }, [db, user]);

    useFocusEffect(
        useCallback(() => {
            loadOrders();
        }, [loadOrders])
    );

    const renderItem = ({ item }: { item: OrderStream }) => {
        const orderNum = item.id.split('_')[1] || item.id;
        const date = new Date(item.createdat).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        const status = STATUS_MAP[item.statusOpcode] || STATUS_MAP[501];

        return (
            <TouchableOpacity
                style={styles.orderCard}
                onPress={() => (navigation as any).navigate('OrderDetails', { streamId: item.id })}
            >
                <View style={styles.orderHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.orderId}>Order #{orderNum}</Text>
                        <Text style={styles.orderDate}>{date}</Text>
                        <Text style={styles.orderedBy}>By: {item.creatorName}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                </View>

                <View style={styles.separator} />

                <View style={styles.orderFooter}>
                    <Text style={styles.itemSummary}>
                        {item.itemCount} {item.itemCount === 1 ? 'Item' : 'Items'} • {item.totalQty} Units
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Orders</Text>
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={Colors.primary} />
                </View>
            ) : orders.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="receipt-outline" size={64} color="#D1D1D6" />
                    <Text style={styles.emptyTitle}>No orders yet</Text>
                    <Text style={styles.emptySubtitle}>Your purchase history will appear here</Text>
                </View>

            ) : (
                <FlatList
                    data={orders}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
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
    orderCard: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    orderId: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
    },
    orderDate: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    orderedBy: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    separator: {
        height: 1,
        backgroundColor: Colors.separator,
        marginBottom: 16,
    },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemSummary: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.textSecondary,
    },
});
