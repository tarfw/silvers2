import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { generateShortId } from '../lib/utils';
import { databaseManager } from '../lib/database';
import { Button } from '../components/ui/Button';

export function CheckoutAddressScreen() {
    const { user, db, isAdmin } = useAuth();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();
    const { selectedActor } = route.params || {};
    const [cartItems, setCartItems] = useState<any[]>([]);
    const targetId = (isAdmin && selectedActor) ? selectedActor.id : user?.id;

    const [addressHistory, setAddressHistory] = useState<any[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Update selection if returned from AddressesScreen
    useEffect(() => {
        if (route.params?.selectedAddressId) {
            setSelectedAddressId(route.params.selectedAddressId);
        }
    }, [route.params?.selectedAddressId]);

    const loadData = useCallback(async () => {
        if (!db || !user || !targetId) return;
        try {
            // 1. Load Cart Items
            const cartRows = await db.all(
                'SELECT * FROM orevents WHERE opcode = ? AND refid = ?',
                [401, user.id]
            ) as any[];
            setCartItems(cartRows);

            // 2. Load Address History for the Target Actor
            const actorData = await db.all('SELECT metadata FROM actors WHERE id = ?', [targetId]) as any[];

            if (actorData?.[0]?.metadata) {
                const metadata = JSON.parse(actorData[0].metadata);
                const addresses = metadata.addresses || [];
                setAddressHistory(addresses);

                // Default selection logic if nothing selected yet
                if (!selectedAddressId && !route.params?.selectedAddressId) {
                    const defaultAddr = addresses.find((a: any) => a.isDefault);
                    if (defaultAddr) {
                        setSelectedAddressId(defaultAddr.id);
                    } else if (addresses.length > 0) {
                        setSelectedAddressId(addresses[0].id);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading checkout data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [db, user, targetId, selectedAddressId, route.params?.selectedAddressId]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const handlePlaceOrder = async () => {
        if (!db || !user || isProcessing) return;

        if (!cartItems || cartItems.length === 0) {
            Alert.alert('Error', 'Cart is empty');
            return;
        }

        const selectedAddress = addressHistory.find(a => a.id === selectedAddressId);
        if (!selectedAddress) {
            Alert.alert('Error', 'Please select a shipping address');
            return;
        }

        const finalAddressText = selectedAddress.text;
        setIsProcessing(true);

        try {
            const orderId = `order_${generateShortId()}`;
            const timestamp = new Date().toISOString();

            // 1. Create Order Stream
            await db.run(`
                INSERT INTO streams (id, scope, createdby, createdat)
                VALUES (?, ?, ?, ?)
            `, [orderId, 'order', user.id, timestamp]);

            // 2. Add Customer as Owner
            await db.run(`
                INSERT INTO streamcollab (streamid, actorid, role, joinedat)
                VALUES (?, ?, ?, ?)
            `, [orderId, targetId, 'owner', timestamp]);

            // 3. Add Line Items (Opcode 501)
            for (const item of cartItems) {
                if (!item) continue;
                const eventId = generateShortId();
                await db.run(`
                    INSERT INTO orevents (id, streamid, opcode, refid, delta, payload, scope, ts)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    eventId,
                    orderId,
                    501,
                    targetId,
                    item.delta || 1,
                    item.payload || '{}',
                    'order',
                    timestamp
                ]);
            }

            // 4. Add Shipping Address (Opcode 506)
            await db.run(`
                INSERT INTO orevents (id, streamid, opcode, refid, delta, payload, scope, ts)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                generateShortId(),
                orderId,
                506,
                targetId,
                0,
                JSON.stringify({ address: selectedAddress }),
                'order',
                timestamp
            ]);

            // 5. Update lastUsed timestamp
            const updatedHistory = addressHistory.map(a =>
                a.id === selectedAddressId ? { ...a, lastUsed: timestamp } : a
            );

            const actorData = await db.all('SELECT metadata FROM actors WHERE id = ?', [targetId]) as any[];
            let currentMetadata = {};
            if (actorData?.[0]?.metadata) {
                try {
                    currentMetadata = JSON.parse(actorData[0].metadata) || {};
                } catch (e) { }
            }

            await db.run('UPDATE actors SET metadata = ? WHERE id = ?', [
                JSON.stringify({ ...currentMetadata, addresses: updatedHistory }),
                targetId
            ]);

            // 6. Clear Cart
            await db.run('DELETE FROM orevents WHERE opcode = ? AND refid = ?', [401, user.id]);

            databaseManager.push().catch((err: any) => console.warn('Order: auto-push failed:', err));

            navigation.replace('OrderDetails', {
                streamId: orderId,
                justPlaced: true
            });
        } catch (error) {
            console.error('Final Order error:', error);
            Alert.alert('Error', 'Failed to place order. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <View className="flex-1 bg-white">
                <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
                <View className="flex-1" style={{ paddingTop: insets.top }}>
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator color="#004c8c" />
                    </View>
                </View>
            </View>
        );
    }

    const selectedAddress = addressHistory.find(a => a.id === selectedAddressId);

    return (
        <View className="flex-1 bg-white">
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
            <View className="flex-1" style={{ paddingTop: insets.top }}>
                <View className="flex-row items-center px-6 pt-4 pb-4">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center -ml-2">
                        <Ionicons name="chevron-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-black ml-2">Checkout</Text>
                </View>

                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 120 }}
                    showsVerticalScrollIndicator={false}
                >
                    {isAdmin && (
                        <View className="mb-10">
                            <Text className="text-[11px] font-bold text-brand-secondary uppercase tracking-[2px] mb-4">Customer Details</Text>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Actors')}
                                activeOpacity={0.7}
                                className="flex-row items-center p-4 bg-white rounded-2xl border border-silver-200 shadow-sm"
                            >
                                <View className="w-12 h-12 rounded-full bg-silver-50 items-center justify-center border border-silver-100">
                                    <Ionicons name="person" size={22} color="#004c8c" />
                                </View>
                                <View className="ml-4 flex-1">
                                    <Text className="text-[16px] font-bold text-black">
                                        {selectedActor ? selectedActor.name : 'Select Customer'}
                                    </Text>
                                    {selectedActor && (
                                        <Text className="text-[12px] text-brand-secondary mt-0.5">{selectedActor.globalcode}</Text>
                                    )}
                                </View>
                                <View className="px-3 py-1 bg-silver-50 rounded-lg">
                                    <Text className="text-[11px] font-bold text-[#004c8c] uppercase">Change</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View className="mb-6">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-[11px] font-bold text-brand-secondary uppercase tracking-[2px]">Shipping Address</Text>
                        </View>

                        {selectedAddress ? (
                            <View>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => navigation.navigate('Addresses', {
                                        selectionMode: true,
                                        targetActorId: targetId,
                                        selectedAddressId: selectedAddressId
                                    })}
                                    className="p-6 rounded-3xl border-2 border-[#004c8c] bg-white shadow-md"
                                >
                                    <View className="flex-row justify-between items-start mb-3">
                                        <View className="flex-1">
                                            <View className="flex-row items-center mb-2">
                                                <View className={`px-2.5 py-1 rounded-lg mr-2 ${selectedAddress.type === 'individual' ? 'bg-blue-50' : 'bg-amber-50'}`}>
                                                    <Text className={`text-[10px] font-bold uppercase tracking-widest ${selectedAddress.type === 'individual' ? 'text-blue-700' : 'text-amber-700'}`}>
                                                        {selectedAddress.type || 'Business'}
                                                    </Text>
                                                </View>
                                                {selectedAddress.isDefault && (
                                                    <Text className="text-[10px] font-bold text-[#004c8c] uppercase tracking-wider">Default</Text>
                                                )}
                                            </View>
                                            {selectedAddress.businessName && (
                                                <Text className="text-lg font-bold text-black mb-1">{selectedAddress.businessName}</Text>
                                            )}
                                            <Text className="text-[16px] leading-6 font-medium text-black">
                                                {selectedAddress.text}
                                            </Text>
                                            <View className="flex-row items-center mt-3 flex-wrap gap-x-6">
                                                {selectedAddress.pincode && (
                                                    <Text className="text-sm text-brand-secondary font-medium">
                                                        {selectedAddress.state ? `${selectedAddress.state} - ` : ''}{selectedAddress.pincode}
                                                    </Text>
                                                )}
                                                {selectedAddress.phone && (
                                                    <Text className="text-sm text-brand-secondary">
                                                        Ph: <Text className="font-bold text-black">{selectedAddress.phone}</Text>
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                        <View className="w-8 h-8 rounded-full bg-silver-50 items-center justify-center">
                                            <Ionicons name="location" size={18} color="#004c8c" />
                                        </View>
                                    </View>
                                    <View className="mt-4 pt-4 border-t border-silver-100 flex-row items-center justify-center">
                                        <Text className="text-[12px] font-bold text-[#004c8c] uppercase tracking-widest">Change Address</Text>
                                        <Ionicons name="chevron-forward" size={14} color="#004c8c" className="ml-1" />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Addresses', {
                                    selectionMode: true,
                                    targetActorId: targetId
                                })}
                                className="items-center justify-center py-16 bg-silver-50 rounded-[32px] border-2 border-dashed border-silver-300"
                            >
                                <View className="w-16 h-16 rounded-full bg-silver-100 items-center justify-center mb-4">
                                    <Ionicons name="location-outline" size={32} color="#004c8c" />
                                </View>
                                <Text className="text-[17px] font-bold text-black mb-1">No Address Selected</Text>
                                <Text className="text-[14px] text-brand-secondary mb-6 text-center px-8">Select a shipping address to continue</Text>
                                <View className="bg-[#004c8c] px-6 py-3 rounded-xl">
                                    <Text className="text-white font-bold uppercase tracking-wider">Select Address</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>

                <View className="p-6 border-t border-silver-100 bg-white" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
                    <TouchableOpacity
                        onPress={handlePlaceOrder}
                        disabled={isProcessing || !selectedAddressId}
                        style={{ backgroundColor: selectedAddressId ? '#004c8c' : '#AEAEB2' }}
                        className={`h-14 rounded-2xl flex-row items-center justify-center shadow-lg ${isProcessing ? 'opacity-50' : ''}`}
                    >
                        {isProcessing ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text className="text-white text-[15px] font-bold uppercase tracking-[1.5px] mr-2">Confirm Order</Text>
                                <Ionicons name="arrow-forward" size={18} color="white" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}
