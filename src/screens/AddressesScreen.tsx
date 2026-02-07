import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Button } from '../components/ui/Button';

export function AddressesScreen() {
    const { user, db } = useAuth();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();
    const { selectionMode, targetActorId, selectedAddressId: currentSelectedId } = route.params || {};
    const actorId = targetActorId || user?.id;

    const [addressHistory, setAddressHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadHistory = useCallback(async () => {
        if (!db || !actorId) return;
        setIsLoading(true);
        try {
            const actorData = await db.all('SELECT metadata FROM actors WHERE id = ?', [actorId]) as any[];
            if (actorData?.[0]?.metadata) {
                const metadata = JSON.parse(actorData[0].metadata);
                setAddressHistory(metadata.addresses || []);
            }
        } catch (error) {
            console.error('Error loading address history:', error);
        } finally {
            setIsLoading(false);
        }
    }, [db, actorId]);

    useFocusEffect(
        useCallback(() => {
            loadHistory();
        }, [loadHistory])
    );

    const handleDeleteAddress = async (id: string) => {
        try {
            const updatedHistory = addressHistory.filter(a => a.id !== id);
            const actorData = await db!.all('SELECT metadata FROM actors WHERE id = ?', [actorId]) as any[];
            const metadata = JSON.parse(actorData[0]?.metadata || '{}');

            await db?.run('UPDATE actors SET metadata = ? WHERE id = ?', [
                JSON.stringify({ ...metadata, addresses: updatedHistory }),
                actorId
            ]);
            setAddressHistory(updatedHistory);
        } catch (error) {
            Alert.alert('Error', 'Failed to delete address');
        }
    };

    const handleAddressPress = (addr: any) => {
        if (selectionMode) {
            navigation.navigate({
                name: 'CheckoutAddress',
                params: { selectedAddressId: addr.id },
                merge: true,
            });
        } else {
            navigation.navigate('AddAddress', { editingAddress: addr, targetActorId: actorId });
        }
    };

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <View className="flex-row items-center px-6 pt-4 pb-5">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-black">{selectionMode ? 'Select Address' : 'Addresses'}</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                <View className="gap-4 mt-4">
                    <TouchableOpacity
                        className="flex-row items-center p-4 rounded-2xl bg-silver-50 border border-silver-100 border-dashed"
                        onPress={() => navigation.navigate('AddAddress', { targetActorId: actorId })}
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
                        addressHistory.map((addr) => {
                            const isSelected = selectionMode && currentSelectedId === addr.id;
                            return (
                                <TouchableOpacity
                                    key={addr.id}
                                    className={`p-4 rounded-2xl border ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-silver-50 border-silver-100'} mb-3`}
                                    onPress={() => handleAddressPress(addr)}
                                    activeOpacity={0.7}
                                >
                                    <View className="flex-row justify-between">
                                        <View className="flex-1 mr-4">
                                            <View className="flex-row items-center mb-1">
                                                <View className={`px-2 py-0.5 rounded-md mr-2 ${addr.type === 'individual' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                                                    <Text className={`text-[10px] font-bold uppercase tracking-wider ${addr.type === 'individual' ? 'text-blue-700' : 'text-amber-700'}`}>
                                                        {addr.type || 'Business'}
                                                    </Text>
                                                </View>
                                                {addr.isDefault && <Text className="text-[10px] font-bold text-brand-primary uppercase tracking-wider">Default</Text>}
                                                {isSelected && (
                                                    <View className="ml-auto bg-blue-500 rounded-full p-0.5">
                                                        <Ionicons name="checkmark" size={12} color="white" />
                                                    </View>
                                                )}
                                            </View>
                                            {addr.businessName && (
                                                <Text className="text-base font-bold text-black mb-0.5">{addr.businessName}</Text>
                                            )}
                                            <Text className="text-base text-black leading-6 mb-1">{addr.text}</Text>
                                            <View className="flex-row flex-wrap gap-x-4 gap-y-1 mb-1">
                                                {addr.pincode ? <Text className="text-xs text-brand-secondary">{addr.state ? `${addr.state} - ` : ''}{addr.pincode}</Text> : null}
                                                {addr.phone && (
                                                    <Text className="text-xs text-brand-secondary">Ph: <Text className="font-medium text-black">{addr.phone}</Text></Text>
                                                )}
                                            </View>
                                        </View>
                                        {!selectionMode && (
                                            <View className="justify-center">
                                                <TouchableOpacity onPress={() => handleDeleteAddress(addr.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>
            </ScrollView >
        </View>
    );
}
