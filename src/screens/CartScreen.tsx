import React, { useState, useCallback } from 'react';
import { View, Text, SafeAreaView, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { SecureImage } from '../components/SecureImage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Button } from '../components/ui/Button';

interface CartEvent {
    id: string;
    streamid: string;
    opcode: number;
    refid: string;
    delta: number;
    payload: string;
    scope: string;
    ts: string;
}

export function CartScreen() {
    const { user, db } = useAuth();
    const navigation = useNavigation<any>();
    const [cartItems, setCartItems] = useState<CartEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadCart = useCallback(async () => {
        if (!db || !user) return;
        setIsLoading(true);
        try {
            const rows = await db.all(
                'SELECT * FROM orevents WHERE opcode = ? AND refid = ? ORDER BY ts DESC',
                [401, user.id]
            ) as any[];
            setCartItems(rows);
        } catch (error) {
            console.error('Error loading cart:', error);
        } finally {
            setIsLoading(false);
        }
    }, [db, user]);

    useFocusEffect(
        useCallback(() => {
            loadCart();
        }, [loadCart])
    );

    const handleRemoveItem = async (id: string) => {
        if (!db) return;
        try {
            await db.run('DELETE FROM orevents WHERE id = ?', [id]);
            loadCart();
        } catch (error) {
            Alert.alert('Error', 'Failed to remove item');
        }
    };

    const handleCheckout = () => {
        if (cartItems.length === 0) return;
        navigation.navigate('CheckoutAddress', { cartItems });
    };

    const renderItem = ({ item }: { item: CartEvent }) => {
        const payload = JSON.parse(item.payload);
        const options = payload.options || {};
        const optionsString = Object.entries(options)
            .map(([group, val]) => `${group}: ${val}`)
            .join(', ');

        return (
            <View className="flex-row items-center py-5 border-b border-silver-100">
                <SecureImage
                    source={{ uri: payload.image || '' }}
                    className="w-20 h-20 rounded-2xl bg-silver-50"
                    fallbackComponent={<View className="w-20 h-20 rounded-2xl bg-silver-100" />}
                />
                <View className="flex-1 ml-4 justify-center">
                    <Text className="text-base font-bold text-black" numberOfLines={1}>{payload.name}</Text>
                    {optionsString ? (
                        <Text className="text-[13px] text-brand-secondary mt-1" numberOfLines={1}>{optionsString}</Text>
                    ) : null}
                    <View className="flex-row items-center justify-between mt-3">
                        <Text className="text-sm font-semibold text-black">Qty: {item.delta}</Text>
                        <TouchableOpacity onPress={() => handleRemoveItem(item.id)}>
                            <Text className="text-sm text-red-500 font-bold">Remove</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    if (isLoading && cartItems.length === 0) {
        return (
            <SafeAreaView className="flex-1 bg-white">
                <View className="px-5 pt-4 pb-5">
                    <Text className="text-4xl font-bold text-black tracking-tight">Cart</Text>
                </View>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator color="#000" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-5 pt-4 pb-5">
                <Text className="text-4xl font-bold text-black tracking-tight">Cart</Text>
            </View>

            {cartItems.length === 0 ? (
                <View className="flex-1 justify-center items-center px-10 pb-20">
                    <View className="w-24 h-24 rounded-full bg-silver-50 justify-center items-center mb-6">
                        <Ionicons name="cart-outline" size={48} color="#D1D1D6" />
                    </View>
                    <Text className="text-xl font-bold text-black mb-2">Your cart is empty</Text>
                    <Text className="text-base text-brand-secondary text-center">Start adding items to your cart</Text>
                </View>
            ) : (
                <FlatList
                    data={cartItems}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {cartItems.length > 0 && (
                <View className="p-6 border-t border-silver-100 bg-white" style={{ paddingBottom: 110 }}>
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-base font-semibold text-brand-secondary">Total Items</Text>
                        <Text className="text-2xl font-bold text-black">
                            {cartItems.reduce((acc, item) => acc + item.delta, 0)}
                        </Text>
                    </View>
                    <Button
                        label="Order Now"
                        onPress={handleCheckout}
                        size="lg"
                    />
                </View>
            )}
        </SafeAreaView>
    );
}
