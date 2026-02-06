import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

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
    502: { label: 'Paid', color: '#007AFF', bgColor: '#E1F5FE' },
    503: { label: 'Shipped', color: '#FF9500', bgColor: '#FFF3E0' },
    504: { label: 'Delivered', color: '#34C759', bgColor: '#E8F5E9' },
    505: { label: 'Cancelled', color: '#FF3B30', bgColor: '#FFEBEE' },
};

export function MyOrdersScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { db, user } = useAuth();
    const [orders, setOrders] = useState<OrderStream[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadOrders = useCallback(async () => {
        if (!db || !user) return;
        setIsLoading(true);

        try {
            // Filter strictly by the current user's role in the stream
            const streams = await db.all(`
                SELECT s.id, s.createdat, a.name as creatorName, a.globalcode as creatorEmail
                FROM streams s
                JOIN streamcollab sc ON s.id = sc.streamid
                LEFT JOIN actors a ON s.createdby = a.id
                WHERE s.scope = 'order' AND sc.actorid = ?
                ORDER BY s.createdat DESC
            `, [user.id]) as any[];

            const orderData: OrderStream[] = [];

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
            console.error('Error loading my orders:', error);
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
                className="bg-silver-50 rounded-[32px] p-5 mb-4 border border-silver-100"
                activeOpacity={0.7}
                onPress={() => (navigation as any).navigate('OrderDetails', { streamId: item.id })}
            >
                <View className="flex-row justify-between items-start mb-4">
                    <View className="flex-1">
                        <Text className="text-[17px] font-bold text-black mb-1">Order #{orderNum}</Text>
                        <Text className="text-[13px] font-medium text-brand-secondary">{date}</Text>
                    </View>
                    <View
                        className="px-3 py-1.5 rounded-full"
                        style={{ backgroundColor: status.bgColor }}
                    >
                        <Text
                            className="text-[11px] font-bold uppercase tracking-wider"
                            style={{ color: status.color }}
                        >
                            {status.label}
                        </Text>
                    </View>
                </View>

                <View className="h-[1px] bg-white mb-4" />

                <View className="flex-row justify-between items-center">
                    <View>
                        <Text className="text-[12px] font-semibold text-brand-secondary mb-1">Created on</Text>
                        <Text className="text-[14px] font-bold text-black">{date}</Text>
                    </View>
                    <View className="items-end">
                        <Text className="text-[12px] font-semibold text-brand-secondary mb-1">{item.itemCount} {item.itemCount === 1 ? 'Item' : 'Items'}</Text>
                        <Text className="text-[14px] font-bold text-black">{item.totalQty} Units</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <View className="flex-1">
                {/* Header */}
                <View className="px-6 pt-6 pb-2 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            className="w-10 h-10 items-center justify-center bg-silver-50 rounded-full mr-4 border border-silver-100"
                        >
                            <Ionicons name="chevron-back" size={20} color="#000" />
                        </TouchableOpacity>
                        <Text className="text-3xl font-bold text-black tracking-tight leading-tight">My Orders</Text>
                    </View>
                    <TouchableOpacity
                        onPress={loadOrders}
                        className="w-10 h-10 items-center justify-center"
                    >
                        <Ionicons name="reload" size={20} color="#000" />
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator color="#000" />
                    </View>
                ) : orders.length === 0 ? (
                    <View className="flex-1 items-center justify-center px-10">
                        <View className="w-20 h-20 bg-silver-50 rounded-full items-center justify-center mb-6 border border-silver-100">
                            <Ionicons name="receipt-outline" size={32} color="#AEAEB2" />
                        </View>
                        <Text className="text-xl font-bold text-black mb-2">No orders yet</Text>
                        <Text className="text-base text-brand-secondary text-center leading-6">
                            Once you place an order, it will appear here.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={orders}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 }}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </View>
    );
}
