import React, { useState, useCallback } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ActivityIndicator, ScrollView, Alert, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { SecureImage } from '../components/SecureImage';
import { generateShortId } from '../lib/utils';

const COLORS = {
    success: '#34C759',
    accent: '#007AFF',
    warning: '#FF9500',
    danger: '#FF3B30',
    silver: '#636366',
};

const STATUS_MAP: Record<number, { label: string; color: string; icon: string }> = {
    501: { label: 'Placed', color: COLORS.silver, icon: 'receipt-outline' },
    502: { label: 'Paid', color: COLORS.accent, icon: 'cash-outline' },
    503: { label: 'Shipped', color: COLORS.warning, icon: 'airplane-outline' },
    504: { label: 'Delivered', color: COLORS.success, icon: 'checkmark-circle-outline' },
    505: { label: 'Cancelled', color: COLORS.danger, icon: 'close-circle-outline' },
};

export function OrderDetailsScreen() {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { streamId } = route.params;
    const { db, user } = useAuth();

    const [items, setItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentStatus, setCurrentStatus] = useState(501);
    const [creatorDetails, setCreatorDetails] = useState<{ name: string; email: string } | null>(null);
    const [shippingAddress, setShippingAddress] = useState<string | null>(null);
    const [showSuccessBar, setShowSuccessBar] = useState(route.params?.justPlaced || false);

    const loadOrderDetails = useCallback(async () => {
        if (!db || !user) return;
        setIsLoading(true);

        try {
            const allEvents = await db.all(
                'SELECT * FROM orevents WHERE streamid = ? ORDER BY ts DESC',
                [streamId]
            ) as any[];

            const orderItems = allEvents.filter(e => e.opcode === 501);
            const latestStatus = allEvents.find(e => e.opcode >= 501 && e.opcode <= 505);

            const streamInfo = await db.all(
                'SELECT a.name, a.globalcode as email FROM streams s LEFT JOIN actors a ON s.createdby = a.id WHERE s.id = ?',
                [streamId]
            ) as any[];

            if (streamInfo?.[0]) {
                setCreatorDetails(streamInfo[0]);
            }

            const addressEvent = allEvents.find(e => e.opcode === 506);
            if (addressEvent) {
                const payload = JSON.parse(addressEvent.payload);
                setShippingAddress(payload.address);
            }

            setItems(orderItems);
            setCurrentStatus(latestStatus?.opcode || 501);
        } catch (error) {
            console.error('Error loading order details:', error);
        } finally {
            setIsLoading(false);
        }
    }, [db, user, streamId]);

    useFocusEffect(
        useCallback(() => {
            loadOrderDetails();

            const onBackPress = () => {
                if (route.params?.justPlaced) {
                    (navigation as any).navigate('MainTabs');
                    return true;
                }
                return false;
            };

            BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
        }, [loadOrderDetails, route.params?.justPlaced, navigation])
    );

    const updateStatus = async (opcode: number) => {
        if (!db || !user) return;

        try {
            await db.run(`
                INSERT INTO orevents (id, streamid, opcode, refid, delta, payload, scope, ts)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                generateShortId(),
                streamId,
                opcode,
                user.id,
                0,
                JSON.stringify({ note: `Status updated to ${STATUS_MAP[opcode].label}` }),
                'order',
                new Date().toISOString()
            ]);
            loadOrderDetails();
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const renderItem = (item: any, isLast: boolean) => {
        const payload = JSON.parse(item.payload);
        const options = payload.options || {};

        return (
            <View key={item.id}>
                <View className="flex-row items-center py-4">
                    <SecureImage source={{ uri: payload.image }} className="w-16 h-16 rounded-2xl bg-white" />
                    <View className="flex-1 ml-4 justify-center">
                        <Text className="text-base font-bold text-black" numberOfLines={1}>{payload.name}</Text>
                        <View className="flex-row flex-wrap gap-2 mt-1.5">
                            {Object.entries(options).map(([key, val]: [string, any]) => (
                                <View key={key} className="bg-white px-2 py-0.5 rounded-md border border-silver-100">
                                    <Text className="text-[10px] text-brand-secondary font-medium uppercase tracking-tight">{key}: {val}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                    <View className="ml-4 bg-white px-3 py-1.5 rounded-xl border border-silver-100">
                        <Text className="text-sm font-bold text-black">x{item.delta}</Text>
                    </View>
                </View>
                {!isLast && <View className="h-[1px] bg-silver-100 opacity-50" />}
            </View>
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-white">
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator color="#000" />
                </View>
            </SafeAreaView>
        );
    }

    const orderNum = streamId.split('_')[1] || streamId;
    const statusInfo = STATUS_MAP[currentStatus];

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-row items-center px-5 pt-4 pb-5">
                <TouchableOpacity
                    onPress={() => {
                        if (route.params?.justPlaced) {
                            (navigation as any).navigate('Home');
                        } else {
                            navigation.goBack();
                        }
                    }}
                    className="mr-4"
                >
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-black">Order #{orderNum}</Text>
            </View>

            {showSuccessBar && (
                <View className="mx-5 mb-4 p-4 rounded-2xl bg-success flex-row items-center justify-between">
                    <View className="flex-row items-center">
                        <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                        <Text className="text-white text-sm font-bold ml-2">Order placed successfully!</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowSuccessBar(false)}>
                        <Ionicons name="close" size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
                {/* Status Section */}
                <View className="mb-8">
                    <Text className="text-[11px] font-bold text-brand-secondary uppercase tracking-widest mb-3 ml-1">Current Status</Text>
                    <View className="flex-row items-center bg-silver-50 rounded-3xl p-5 border border-silver-100">
                        <Ionicons name={statusInfo.icon as any} size={28} color={statusInfo.color} />
                        <Text className="text-xl font-bold ml-4" style={{ color: statusInfo.color }}>
                            {statusInfo.label}
                        </Text>
                    </View>
                </View>

                {/* Tracking/Update Process */}
                <View className="mb-8">
                    <Text className="text-[11px] font-bold text-brand-secondary uppercase tracking-widest mb-3 ml-1">Track & Update</Text>
                    <View className="flex-row gap-2.5">
                        {[502, 503, 504].map(code => (
                            <TouchableOpacity
                                key={code}
                                className={`flex-1 p-4 rounded-2xl border items-center justify-center ${currentStatus === code ? 'bg-black border-black' : 'bg-silver-50 border-silver-100'}`}
                                onPress={() => updateStatus(code)}
                            >
                                <Ionicons
                                    name={STATUS_MAP[code].icon as any}
                                    size={20}
                                    color={currentStatus === code ? '#FFF' : STATUS_MAP[code].color}
                                />
                                <Text className={`text-[11px] font-bold mt-2 ${currentStatus === code ? 'text-white' : 'text-black'}`}>
                                    {STATUS_MAP[code].label.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Customer & Shipping Row */}
                <View className="flex-row gap-4 mb-8">
                    {creatorDetails && (
                        <View className="flex-1">
                            <Text className="text-[11px] font-bold text-brand-secondary uppercase tracking-widest mb-3 ml-1">Customer</Text>
                            <View className="bg-silver-50 rounded-2xl p-4 border border-silver-100 h-28 justify-center">
                                <Text className="text-base font-bold text-black" numberOfLines={1}>{creatorDetails.name}</Text>
                                <Text className="text-xs text-brand-secondary mt-1" numberOfLines={1}>{creatorDetails.email}</Text>
                            </View>
                        </View>
                    )}
                    {shippingAddress && (
                        <View className="flex-1">
                            <Text className="text-[11px] font-bold text-brand-secondary uppercase tracking-widest mb-3 ml-1">Shipping</Text>
                            <View className="bg-silver-50 rounded-2xl p-4 border border-silver-100 h-28">
                                <View className="flex-row">
                                    <Ionicons name="location-sharp" size={14} color="#636366" />
                                    <Text className="text-xs text-black ml-1.5 leading-4" numberOfLines={4}>{shippingAddress}</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </View>

                {/* Items Section */}
                <View className="mb-8">
                    <Text className="text-[11px] font-bold text-brand-secondary uppercase tracking-widest mb-3 ml-1">Items ({items.length})</Text>
                    <View className="bg-silver-50 rounded-3xl px-4 border border-silver-100">
                        {items.map((item, index) => renderItem(item, index === items.length - 1))}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
