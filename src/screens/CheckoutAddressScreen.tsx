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
    const { cartItems, selectedActor } = route.params || {};

    const [addressHistory, setAddressHistory] = useState<any[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [newAddress, setNewAddress] = useState('');
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [setAsDefault, setSetAsDefault] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            if (!db || !user) return;
            try {
                const actorData = await db.all('SELECT metadata FROM actors WHERE id = ?', [user.id]) as any[];
                if (actorData?.[0]?.metadata) {
                    const metadata = JSON.parse(actorData[0].metadata);
                    const addresses = metadata.addresses || [];
                    setAddressHistory(addresses);

                    const defaultAddr = addresses.find((a: any) => a.isDefault);
                    if (defaultAddr) {
                        setSelectedAddressId(defaultAddr.id);
                    } else if (addresses.length > 0) {
                        setSelectedAddressId(addresses[0].id);
                    } else {
                        setIsAddingNew(true);
                    }
                } else {
                    setIsAddingNew(true);
                }
            } catch (error) {
                console.error('Error loading address history:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadHistory();
    }, [db, user]);

    const handlePlaceOrder = async () => {
        if (!db || !user || isProcessing) return;

        const customerId = (isAdmin && selectedActor) ? selectedActor.id : user.id;
        const finalAddressText = isAddingNew ? newAddress.trim() : addressHistory.find(a => a.id === selectedAddressId)?.text;

        if (!finalAddressText) {
            Alert.alert('Error', 'Please provide a shipping address');
            return;
        }

        setIsProcessing(true);

        try {
            const orderId = `order_${generateShortId()}`;
            const timestamp = new Date().toISOString();

            await db.run(`
                INSERT INTO streams (id, scope, createdby, createdat)
                VALUES (?, ?, ?, ?)
            `, [orderId, 'order', user.id, timestamp]);

            await db.run(`
                INSERT INTO streamcollab (streamid, actorid, role, joinedat)
                VALUES (?, ?, ?, ?)
            `, [orderId, customerId, 'owner', timestamp]);

            for (const item of cartItems) {
                const eventId = generateShortId();
                await db.run(`
                    INSERT INTO orevents (id, streamid, opcode, refid, delta, payload, scope, ts)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    eventId,
                    orderId,
                    501,
                    customerId,
                    item.delta,
                    item.payload,
                    'order',
                    timestamp
                ]);
            }

            await db.run(`
                INSERT INTO orevents (id, streamid, opcode, refid, delta, payload, scope, ts)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                generateShortId(),
                orderId,
                506,
                customerId,
                0,
                JSON.stringify({ address: finalAddressText }),
                'order',
                timestamp
            ]);

            let updatedHistory = [...addressHistory];
            const normalizedNew = finalAddressText.toLowerCase().trim();
            const existingIdx = updatedHistory.findIndex(a => a.text.toLowerCase().trim() === normalizedNew);

            if (existingIdx >= 0) {
                updatedHistory[existingIdx] = { ...updatedHistory[existingIdx], lastUsed: timestamp };
                if (setAsDefault) {
                    updatedHistory = updatedHistory.map((a, i) => ({ ...a, isDefault: i === existingIdx }));
                }
            } else {
                const newAddrObj = {
                    id: `addr_${generateShortId()}`,
                    text: finalAddressText,
                    isDefault: setAsDefault || updatedHistory.length === 0,
                    lastUsed: timestamp
                };
                if (newAddrObj.isDefault) {
                    updatedHistory = updatedHistory.map(a => ({ ...a, isDefault: false }));
                }
                updatedHistory.unshift(newAddrObj);
            }

            await db.run('UPDATE actors SET metadata = ? WHERE id = ?', [
                JSON.stringify({ addresses: updatedHistory }),
                user.id
            ]);

            await db.run('DELETE FROM orevents WHERE opcode = ? AND refid = ?', [401, user.id]);

            navigation.replace('OrderDetails', {
                streamId: orderId,
                justPlaced: true
            });
        } catch (error) {
            console.error('Order error:', error);
            Alert.alert('Error', 'Failed to place order');
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

                {addressHistory.length > 0 && !isAddingNew ? (
                    <View className="gap-3">
                        {addressHistory.map((addr) => (
                            <TouchableOpacity
                                key={addr.id}
                                className={`flex-row items-center p-4 rounded-2xl border ${selectedAddressId === addr.id ? 'border-brand-primary bg-white' : 'border-transparent bg-silver-50'}`}
                                onPress={() => setSelectedAddressId(addr.id)}
                            >
                                <Ionicons
                                    name={selectedAddressId === addr.id ? "radio-button-on" : "radio-button-off"}
                                    size={20}
                                    color={selectedAddressId === addr.id ? "#000" : "#636366"}
                                />
                                <View className="flex-1 ml-3">
                                    <Text className="text-base text-black">{addr.text}</Text>
                                    {addr.isDefault && <Text className="text-[10px] font-bold text-brand-primary mt-1 uppercase tracking-wider">Default</Text>}
                                </View>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            className="flex-row items-center p-3 mt-2"
                            onPress={() => setIsAddingNew(true)}
                        >
                            <Ionicons name="add" size={20} color="#000" />
                            <Text className="text-base font-semibold text-brand-primary ml-2">Use a different address</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View className="gap-4">
                        <Input
                            value={newAddress}
                            onChangeText={setNewAddress}
                            placeholder="Enter full shipping address..."
                            multiline
                            numberOfLines={4}
                            autoFocus
                            textAlignVertical="top"
                            containerClassName="h-32 mb-8"
                        />
                        <TouchableOpacity
                            className="flex-row items-center pl-1"
                            onPress={() => setSetAsDefault(!setAsDefault)}
                        >
                            <Ionicons
                                name={setAsDefault ? "checkbox" : "square-outline"}
                                size={22}
                                color={setAsDefault ? "#000" : "#636366"}
                            />
                            <Text className="text-sm text-black ml-2.5">Set as default address</Text>
                        </TouchableOpacity>
                        {addressHistory.length > 0 && (
                            <TouchableOpacity
                                onPress={() => setIsAddingNew(false)}
                                className="py-3 items-center"
                            >
                                <Text className="text-sm text-brand-secondary font-medium">Choose from saved addresses</Text>
                            </TouchableOpacity>
                        )}
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
