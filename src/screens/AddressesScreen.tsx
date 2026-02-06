import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { generateShortId } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function AddressesScreen() {
    const { user, db } = useAuth();
    const navigation = useNavigation<any>();

    const [addressHistory, setAddressHistory] = useState<any[]>([]);
    const [newAddress, setNewAddress] = useState('');
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const loadHistory = async () => {
        if (!db || !user) return;
        setIsLoading(true);
        try {
            const actorData = await db.all('SELECT metadata FROM actors WHERE id = ?', [user.id]) as any[];
            if (actorData?.[0]?.metadata) {
                const metadata = JSON.parse(actorData[0].metadata);
                setAddressHistory(metadata.addresses || []);
            }
        } catch (error) {
            console.error('Error loading address history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, [db, user]);

    const handleSaveAddress = async () => {
        if (!db || !user || !newAddress.trim()) return;

        try {
            let updatedHistory = [...addressHistory];
            const newAddrObj = {
                id: `addr_${generateShortId()}`,
                text: newAddress.trim(),
                isDefault: updatedHistory.length === 0,
                lastUsed: new Date().toISOString()
            };

            updatedHistory.unshift(newAddrObj);

            await db.run('UPDATE actors SET metadata = ? WHERE id = ?', [
                JSON.stringify({ ...JSON.parse((await db.all('SELECT metadata FROM actors WHERE id = ?', [user.id]) as any[])[0]?.metadata || '{}'), addresses: updatedHistory }),
                user.id
            ]);

            setAddressHistory(updatedHistory);
            setNewAddress('');
            setIsAddingNew(false);
            Alert.alert('Success', 'Address added successfully');
        } catch (error) {
            console.error('Error saving address:', error);
            Alert.alert('Error', 'Failed to save address');
        }
    };

    const handleDeleteAddress = async (id: string) => {
        try {
            const updatedHistory = addressHistory.filter(a => a.id !== id);
            await db?.run('UPDATE actors SET metadata = ? WHERE id = ?', [
                JSON.stringify({ ...JSON.parse((await db.all('SELECT metadata FROM actors WHERE id = ?', [user!.id]) as any[])[0]?.metadata || '{}'), addresses: updatedHistory }),
                user!.id
            ]);
            setAddressHistory(updatedHistory);
        } catch (error) {
            Alert.alert('Error', 'Failed to delete address');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-row items-center px-5 pt-4 pb-5">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-black">Addresses</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {isAddingNew ? (
                    <View className="gap-4 mt-4">
                        <Text className="text-lg font-semibold text-black mb-2">Add New Address</Text>
                        <Input
                            value={newAddress}
                            onChangeText={setNewAddress}
                            placeholder="Enter full shipping address..."
                            multiline
                            numberOfLines={4}
                            containerClassName="h-32 mb-4"
                        />
                        <Button label="Save Address" onPress={handleSaveAddress} size="lg" />
                        <TouchableOpacity onPress={() => setIsAddingNew(false)} className="py-3 items-center">
                            <Text className="text-sm text-brand-secondary font-medium">Cancel</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View className="gap-4 mt-4">
                        <TouchableOpacity
                            className="flex-row items-center p-4 rounded-2xl bg-silver-50 border border-silver-100 border-dashed"
                            onPress={() => setIsAddingNew(true)}
                        >
                            <Ionicons name="add-circle-outline" size={24} color="#000" />
                            <Text className="text-base font-bold text-black ml-3">Add New Address</Text>
                        </TouchableOpacity>

                        {isLoading ? (
                            <ActivityIndicator color="#000" style={{ marginTop: 20 }} />
                        ) : addressHistory.length === 0 ? (
                            <View className="items-center py-20">
                                <Text className="text-brand-secondary">No saved addresses</Text>
                            </View>
                        ) : (
                            addressHistory.map((addr) => (
                                <View
                                    key={addr.id}
                                    className="p-4 rounded-2xl bg-silver-50 border border-silver-100"
                                >
                                    <View className="flex-row justify-between">
                                        <View className="flex-1 mr-4">
                                            <Text className="text-base text-black">{addr.text}</Text>
                                            {addr.isDefault && <Text className="text-[10px] font-bold text-brand-primary mt-1 uppercase tracking-wider">Default</Text>}
                                        </View>
                                        <TouchableOpacity onPress={() => handleDeleteAddress(addr.id)}>
                                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
