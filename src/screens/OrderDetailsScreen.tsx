import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert, BackHandler, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
    const insets = useSafeAreaInsets();
    const { streamId } = route.params;
    const { db, user } = useAuth();

    const [items, setItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentStatus, setCurrentStatus] = useState(501);
    const [creatorDetails, setCreatorDetails] = useState<{ name: string; email: string } | null>(null);
    const [shippingAddress, setShippingAddress] = useState<string | null>(null);
    const [showSuccessBar, setShowSuccessBar] = useState(route.params?.justPlaced || false);
    const [isStatusDrawerVisible, setIsStatusDrawerVisible] = useState(false);

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
                'SELECT a.name, a.globalcode as email FROM streamcollab sc JOIN actors a ON sc.actorid = a.id WHERE sc.streamid = ? AND sc.role = "owner"',
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
            <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator color="#004c8c" />
                </View>
            </View>
        );
    }


    const orderNum = streamId.split('_')[1] || streamId;
    const statusInfo = STATUS_MAP[currentStatus];

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <View className="flex-1">
                {/* Minimal Header */}
                <View className="px-6 pt-6 pb-6 flex-row items-center justify-between border-b border-silver-50">
                    <TouchableOpacity
                        onPress={() => {
                            if (route.params?.justPlaced) {
                                (navigation as any).navigate('Home');
                            } else {
                                navigation.goBack();
                            }
                        }}
                        className="w-10 h-10 items-center justify-center bg-white rounded-full border border-silver-100 shadow-sm"
                    >
                        <Ionicons name="chevron-back" size={20} color="#000" />
                    </TouchableOpacity>

                    <View className="items-end">
                        <Text className="text-[9px] font-bold text-brand-secondary uppercase tracking-[2px]">Digital Receipt / Order</Text>
                        <Text className="text-lg font-bold text-black tracking-tight" numberOfLines={1}>#{orderNum}</Text>
                    </View>
                </View>

                {/* Floating Notification */}
                {showSuccessBar && (
                    <View className="absolute top-[160px] left-6 right-6 z-[60] bg-[#004c8c] flex-row items-center px-6 py-4 rounded-2xl shadow-xl">
                        <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                        <Text className="text-white text-[12px] font-bold flex-1 ml-3 uppercase tracking-wider">Success: Order Logged</Text>
                        <TouchableOpacity onPress={() => setShowSuccessBar(false)}>
                            <Ionicons name="close" size={18} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                )}

                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 40, paddingBottom: 140 }}
                    showsVerticalScrollIndicator={false}
                    className="flex-1"
                >
                    {/* Invoice Meta */}
                    <View className="flex-row justify-between mb-12">
                        <View>
                            <Text className="text-[10px] font-bold text-brand-secondary uppercase tracking-[2.5px] mb-2">Generated On</Text>
                            <Text className="text-base font-bold text-black">
                                {items[0] ? new Date(items[0].ts).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '---'}
                            </Text>
                        </View>
                        <View className="items-end">
                            <Text className="text-[10px] font-bold text-brand-secondary uppercase tracking-[2.5px] mb-2">Current Stage</Text>
                            <TouchableOpacity
                                onPress={() => setIsStatusDrawerVisible(true)}
                                className="px-4 py-1.5 rounded-full border bg-white flex-row items-center"
                                style={{ borderColor: statusInfo.color }}
                            >
                                <Text className="text-[10px] font-extrabold uppercase tracking-widest mr-2" style={{ color: statusInfo.color }}>
                                    {statusInfo.label}
                                </Text>
                                <Ionicons name="chevron-down" size={12} color={statusInfo.color} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Parties Section */}
                    <View className="mb-14">
                        <View className="mb-10">
                            <Text className="text-[10px] font-bold text-brand-secondary uppercase tracking-[2px] mb-3">Customer Details</Text>
                            {creatorDetails && (
                                <View>
                                    <Text className="text-xl font-bold text-black tracking-tight">{creatorDetails.name}</Text>
                                    <Text className="text-[13px] font-medium text-brand-secondary mt-0.5">{creatorDetails.email}</Text>
                                </View>
                            )}
                        </View>

                        {shippingAddress && (
                            <View className="pt-8 border-t border-silver-100">
                                <Text className="text-[10px] font-bold text-brand-secondary uppercase tracking-[2px] mb-3">Delivery Address</Text>
                                <Text className="text-[16px] font-bold text-black leading-6">
                                    {shippingAddress}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Breakdown Header */}
                    <View className="flex-row pb-4 border-b-2 border-black/5 mb-2">
                        <Text className="flex-1 text-[10px] font-bold text-brand-secondary uppercase tracking-[2px]">Line Items</Text>
                        <Text className="w-16 text-[10px] font-bold text-brand-secondary uppercase tracking-[2px] text-right">Unit QTY</Text>
                    </View>

                    {items.map((item, index) => {
                        const payload = JSON.parse(item.payload);
                        const isLast = index === items.length - 1;
                        return (
                            <View key={item.id} className={`flex-row py-6 ${!isLast ? 'border-b border-silver-50' : ''}`}>
                                <View className="flex-1 flex-row">
                                    <View className="w-12 h-12 rounded-2xl bg-silver-50 items-center justify-center overflow-hidden border border-silver-100">
                                        <SecureImage source={{ uri: payload.image }} className="w-full h-full" />
                                    </View>
                                    <View className="flex-1 ml-5 justify-center">
                                        <Text className="text-[16px] font-bold text-black mb-1">{payload.name}</Text>
                                        <View className="flex-row flex-wrap gap-x-3">
                                            {Object.entries(payload.options || {}).map(([k, v]: [string, any]) => (
                                                <Text key={k} className="text-[10px] font-bold text-brand-secondary uppercase tracking-tighter">
                                                    {k}: {v}
                                                </Text>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                                <View className="w-16 items-end justify-center">
                                    <Text className="text-[16px] font-bold text-black">
                                        {item.delta}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Fulfillment Status Bottom Drawer */}
            <Modal
                visible={isStatusDrawerVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsStatusDrawerVisible(false)}
            >
                <View className="flex-1 justify-end">
                    <TouchableOpacity
                        className="absolute inset-0 bg-black/40"
                        activeOpacity={1}
                        onPress={() => setIsStatusDrawerVisible(false)}
                    />
                    <View
                        className="bg-white rounded-t-[40px] px-8 pt-4 pb-12 shadow-2xl"
                        style={{ paddingBottom: Math.max(insets.bottom, 40) }}
                    >
                        <View className="w-12 h-1 bg-silver-100 rounded-full self-center mb-10" />

                        <Text className="text-[11px] font-bold text-brand-secondary uppercase tracking-[3px] mb-8 text-center">Fulfillment Status</Text>

                        <View className="bg-silver-50 rounded-[32px] overflow-hidden border border-silver-100">
                            {[502, 503, 504].map((code, index) => {
                                const isActive = currentStatus === code;
                                const isLast = index === 2;
                                return (
                                    <TouchableOpacity
                                        key={code}
                                        onPress={() => {
                                            updateStatus(code);
                                            setIsStatusDrawerVisible(false);
                                        }}
                                        className={`flex-row items-center px-6 py-5 ${!isLast ? 'border-b border-white' : ''} ${isActive ? 'bg-black' : 'bg-transparent'}`}
                                        activeOpacity={0.7}
                                    >
                                        <View className={`w-10 h-10 rounded-full items-center justify-center ${isActive ? 'bg-white/10' : 'bg-white shadow-sm'}`}>
                                            <Ionicons
                                                name={STATUS_MAP[code].icon as any}
                                                size={18}
                                                color={isActive ? '#FFF' : '#000'}
                                            />
                                        </View>
                                        <View className="ml-4 flex-1">
                                            <Text className={`text-[13px] font-bold uppercase tracking-wider ${isActive ? 'text-white' : 'text-black'}`}>
                                                {STATUS_MAP[code].label}
                                            </Text>
                                        </View>
                                        {isActive && (
                                            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
