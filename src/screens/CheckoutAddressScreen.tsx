import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { generateShortId } from '../lib/utils';
import { databaseManager } from '../lib/database';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function CheckoutAddressScreen() {
    const { user, db, isAdmin } = useAuth();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();
    const { selectedActor } = route.params || {};
    const [cartItems, setCartItems] = useState<any[]>([]);

    const [addressHistory, setAddressHistory] = useState<any[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [newAddress, setNewAddress] = useState('');
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [setAsDefault, setSetAsDefault] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Initial Load: Fetch Cart Items and Address History
    useEffect(() => {
        const initialize = async () => {
            if (!db || !user) return;
            setIsLoading(true);
            try {
                // 1. Load Cart Items (Robust source of truth)
                const cartRows = await db.all(
                    'SELECT * FROM orevents WHERE opcode = ? AND refid = ?',
                    [401, user.id]
                ) as any[];
                setCartItems(cartRows);

                // 2. Load Address History for the Target Actor
                const targetId = (isAdmin && selectedActor) ? selectedActor.id : user.id;
                const actorData = await db.all('SELECT metadata FROM actors WHERE id = ?', [targetId]) as any[];

                if (actorData?.[0]?.metadata) {
                    const metadata = JSON.parse(actorData[0].metadata);
                    const addresses = metadata.addresses || [];
                    setAddressHistory(addresses);

                    const defaultAddr = addresses.find((a: any) => a.isDefault);
                    if (defaultAddr) {
                        setSelectedAddressId(defaultAddr.id);
                        setIsAddingNew(false);
                    } else if (addresses.length > 0) {
                        setSelectedAddressId(addresses[0].id);
                        setIsAddingNew(false);
                    } else {
                        setIsAddingNew(true);
                        setSelectedAddressId(null);
                    }
                } else {
                    setAddressHistory([]);
                    setIsAddingNew(true);
                    setSelectedAddressId(null);
                }
            } catch (error) {
                console.error('Error initializing checkout data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        initialize();
    }, [db, user, isAdmin, selectedActor]);

    const handlePlaceOrder = async () => {
        if (!db || !user || isProcessing) return;

        if (!cartItems || cartItems.length === 0) {
            Alert.alert('Error', 'Cart is empty');
            return;
        }

        const targetId = (isAdmin && selectedActor) ? selectedActor.id : user.id;
        const selectedAddress = addressHistory.find(a => a.id === selectedAddressId);
        const finalAddressText = isAddingNew ? newAddress.trim() : (selectedAddress?.text || '');

        if (!finalAddressText) {
            Alert.alert('Error', 'Please provide a shipping address');
            return;
        }

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
                JSON.stringify({ address: finalAddressText }),
                'order',
                timestamp
            ]);

            // 5. Update Address History for the Target Actor
            const actorData = await db.all('SELECT metadata FROM actors WHERE id = ?', [targetId]) as any[];
            let currentMetadata = {};
            if (actorData?.[0]?.metadata) {
                try {
                    currentMetadata = JSON.parse(actorData[0].metadata) || {};
                } catch (e) {
                    console.error('Failed to parse actor metadata:', e);
                }
            }

            let updatedHistory = Array.isArray(addressHistory) ? [...addressHistory] : [];
            const normalizedNew = finalAddressText.toLowerCase().trim();
            const existingIdx = updatedHistory.findIndex(a => a?.text?.toLowerCase().trim() === normalizedNew);

            if (existingIdx >= 0) {
                const existingAddr = updatedHistory[existingIdx];
                if (existingAddr) {
                    updatedHistory[existingIdx] = { ...existingAddr, lastUsed: timestamp };
                    if (setAsDefault) {
                        updatedHistory = updatedHistory.map((a, i) => ({ ...a, isDefault: i === existingIdx }));
                    }
                }
            } else {
                const newAddrObj = {
                    id: `addr_${generateShortId()}`,
                    text: finalAddressText,
                    isDefault: setAsDefault || updatedHistory.length === 0,
                    lastUsed: timestamp
                };
                if (newAddrObj.isDefault) {
                    updatedHistory = updatedHistory.map(a => a ? { ...a, isDefault: false } : a);
                }
                updatedHistory.unshift(newAddrObj);
            }

            // Merge and update
            const finalMetadata = {
                ...currentMetadata,
                addresses: updatedHistory
            };

            await db.run('UPDATE actors SET metadata = ? WHERE id = ?', [
                JSON.stringify(finalMetadata),
                targetId
            ]);

            // 6. Clear Cart
            await db.run('DELETE FROM orevents WHERE opcode = ? AND refid = ?', [401, user.id]);

            // Trigger background push for the new order
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
                    contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 100 }}
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
                        <Text className="text-[11px] font-bold text-brand-secondary uppercase tracking-[2px] mb-4">Shipping Address</Text>

                        {isAddingNew ? (
                            <View className="bg-silver-50 p-5 rounded-[20px] border border-silver-100">
                                <Text className="text-[13px] font-bold text-black mb-4">Add New Location</Text>
                                <Input
                                    value={newAddress}
                                    onChangeText={setNewAddress}
                                    placeholder="Enter full delivery address..."
                                    multiline
                                    numberOfLines={3}
                                    autoFocus
                                    textAlignVertical="top"
                                    containerClassName="h-28 mb-6 bg-white border-silver-200"
                                />
                                <TouchableOpacity
                                    className="flex-row items-center mb-6"
                                    onPress={() => setSetAsDefault(!setAsDefault)}
                                >
                                    <Ionicons
                                        name={setAsDefault ? "checkbox" : "square-outline"}
                                        size={20}
                                        color={setAsDefault ? "#004c8c" : "#AEAEB2"}
                                    />
                                    <Text className="text-[14px] font-medium text-black ml-3">Set as primary address</Text>
                                </TouchableOpacity>

                                <View className="flex-row gap-3">
                                    {addressHistory.length > 0 && (
                                        <TouchableOpacity
                                            onPress={() => setIsAddingNew(false)}
                                            className="flex-1 h-12 rounded-xl border border-silver-200 items-center justify-center bg-white"
                                        >
                                            <Text className="text-[13px] text-brand-secondary font-bold uppercase tracking-wider">Cancel</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        ) : (
                            <View className="gap-3">
                                {addressHistory.map((addr) => {
                                    const isSelected = selectedAddressId === addr.id;
                                    return (
                                        <TouchableOpacity
                                            key={addr.id}
                                            activeOpacity={0.8}
                                            style={{
                                                borderColor: isSelected ? '#004c8c' : '#E5E5EA',
                                                backgroundColor: isSelected ? '#F8FBFF' : '#FFFFFF',
                                                borderWidth: isSelected ? 2 : 1
                                            }}
                                            className="flex-row items-center p-5 rounded-2xl shadow-sm"
                                            onPress={() => setSelectedAddressId(addr.id)}
                                        >
                                            <View className="flex-1">
                                                <View className="flex-row items-center justify-between mb-1">
                                                    <Text className={`text-[15px] ${isSelected ? 'font-bold text-black' : 'text-[#3A3A3C] font-medium'}`}>
                                                        Home / Work Location
                                                    </Text>
                                                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#004c8c" />}
                                                </View>
                                                <Text className={`text-[13px] leading-5 ${isSelected ? 'text-black' : 'text-brand-secondary'}`} numberOfLines={2}>
                                                    {addr.text}
                                                </Text>
                                                {addr.isDefault && (
                                                    <View className="bg-[#004c8c]/10 self-start px-2 py-0.5 rounded-md mt-2">
                                                        <Text className="text-[9px] font-bold text-[#004c8c] uppercase tracking-wider">Default</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}

                                <TouchableOpacity
                                    className="flex-row items-center justify-center h-14 rounded-2xl border border-dashed border-silver-300 bg-silver-50 mt-2"
                                    onPress={() => {
                                        setIsAddingNew(true);
                                        setSelectedAddressId(null);
                                    }}
                                >
                                    <Ionicons name="add" size={18} color="#004c8c" />
                                    <Text className="text-[13px] font-bold text-[#004c8c] ml-2 uppercase tracking-widest">New Delivery Address</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </ScrollView>

                <View className="p-6 border-t border-silver-100 bg-white" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
                    <TouchableOpacity
                        onPress={handlePlaceOrder}
                        disabled={isProcessing}
                        style={{ backgroundColor: '#004c8c' }}
                        className={`h-14 rounded-2xl flex-row items-center justify-center shadow-lg ${isProcessing ? 'opacity-50' : ''}`}
                    >
                        {isProcessing ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text className="text-white text-[15px] font-bold uppercase tracking-[1.5px] mr-2">Place Order</Text>
                                <Ionicons name="arrow-forward" size={18} color="white" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}
