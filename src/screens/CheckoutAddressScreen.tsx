import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { generateShortId } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function CheckoutAddressScreen() {
    const { user, db, isAdmin } = useAuth();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
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
            <SafeAreaView className="flex-1 bg-white">
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator color="#000" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-row items-center px-5 pt-4 pb-5">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-black">Shipping</Text>
            </View>

            {isAdmin && (
                <View className="px-5 mb-4">
                    <Text className="text-sm font-bold text-brand-secondary uppercase tracking-widest mb-2">Customer</Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Actors')}
                        className="flex-row items-center p-4 bg-silver-50 rounded-2xl border border-silver-100"
                    >
                        <View className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm border border-silver-50">
                            <Ionicons name="person-outline" size={20} color="#000" />
                        </View>
                        <View className="ml-3 flex-1">
                            <Text className="text-base font-bold text-black">
                                {selectedActor ? selectedActor.name : 'Select Customer'}
                            </Text>
                            {selectedActor && (
                                <Text className="text-xs text-brand-secondary">{selectedActor.globalcode}</Text>
                            )}
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#AEAEB2" />
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                <Text className="text-lg font-semibold text-black mb-6 mt-2">Where should we send your order?</Text>

                {isAddingNew ? (
                    <View className="gap-4">
                        <Input
                            value={newAddress}
                            onChangeText={setNewAddress}
                            placeholder="Enter full shipping address..."
                            multiline
                            numberOfLines={4}
                            autoFocus
                            textAlignVertical="top"
                            containerClassName="h-32 mb-4"
                        />
                        <TouchableOpacity
                            className="flex-row items-center pl-1 mb-4"
                            onPress={() => setSetAsDefault(!setAsDefault)}
                        >
                            <Ionicons
                                name={setAsDefault ? "checkbox" : "square-outline"}
                                size={22}
                                color={setAsDefault ? "#004c8c" : "#636366"}
                            />
                            <Text className="text-sm text-black ml-2.5">Set as default address</Text>
                        </TouchableOpacity>

                        {addressHistory.length > 0 && (
                            <TouchableOpacity
                                onPress={() => setIsAddingNew(false)}
                                className="py-4 rounded-2xl border border-silver-100 items-center justify-center bg-silver-50"
                            >
                                <Text className="text-sm text-black font-bold uppercase tracking-wider">Choose from saved addresses</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <View className="gap-4">
                        {addressHistory.map((addr) => {
                            const isSelected = selectedAddressId === addr.id;
                            return (
                                <TouchableOpacity
                                    key={addr.id}
                                    activeOpacity={0.7}
                                    style={{
                                        borderColor: isSelected ? '#004c8c' : '#E5E5EA',
                                        backgroundColor: isSelected ? '#F1F7FF' : '#F2F2F7',
                                        borderWidth: 1.5
                                    }}
                                    className="flex-row items-center p-5 rounded-3xl"
                                    onPress={() => setSelectedAddressId(addr.id)}
                                >
                                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${isSelected ? 'border-[#004c8c] bg-[#004c8c]' : 'border-[#C7C7CC]'}`}>
                                        {isSelected && <View className="w-2 h-2 rounded-full bg-white" />}
                                    </View>
                                    <View className="flex-1 ml-4 mr-2">
                                        <Text className={`text-[15px] leading-5 ${isSelected ? 'text-black font-bold' : 'text-[#3A3A3C] font-medium'}`}>{addr.text}</Text>
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
                            className="flex-row items-center justify-center p-5 mt-2 rounded-[32px] border border-dashed border-silver-300 bg-silver-50"
                            onPress={() => {
                                setIsAddingNew(true);
                                setSelectedAddressId(null);
                            }}
                        >
                            <Ionicons name="add" size={20} color="#000" />
                            <Text className="text-base font-bold text-black ml-2 uppercase tracking-wider text-[13px]">Add New Address</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            <View className="p-5 border-t border-silver-100 bg-white">
                <Button
                    label="Confirm & Place Order"
                    onPress={handlePlaceOrder}
                    isLoading={isProcessing}
                    size="lg"
                />
            </View>
        </SafeAreaView>
    );
}
