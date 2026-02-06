import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
    const insets = useSafeAreaInsets();
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
            <View className="flex-row items-center py-6 border-b border-silver-100">
                <SecureImage
                    source={{ uri: payload.image || '' }}
                    style={{ borderRadius: 16 }}
                    className="w-20 h-20 bg-silver-50"
                    fallbackComponent={<View style={{ borderRadius: 16 }} className="w-20 h-20 bg-silver-100" />}
                />
                <View className="flex-1 ml-4">
                    <Text className="text-lg font-bold text-black" numberOfLines={1}>{payload.name}</Text>
                    {optionsString ? (
                        <Text className="text-[13px] text-brand-secondary mt-0.5 leading-4" numberOfLines={2}>{optionsString}</Text>
                    ) : null}
                    <View className="flex-row items-center justify-between mt-3">
                        <Text className="text-[14px] font-bold text-black">Qty: {item.delta}</Text>
                        <TouchableOpacity
                            onPress={() => handleRemoveItem(item.id)}
                            activeOpacity={0.7}
                        >
                            <Text className="text-[13px] text-red-500 font-bold uppercase tracking-wider">Remove</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    if (isLoading && cartItems.length === 0) {
        return (
            <View className="flex-1 bg-white">
                <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
                <View className="flex-1" style={{ paddingTop: insets.top }}>
                    <View className="px-6 pt-4 pb-4">
                        <Text className="text-4xl font-bold text-black tracking-tighter">Cart</Text>
                    </View>
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
                <View className="px-6 pt-4 pb-4">
                    <Text className="text-4xl font-bold text-black tracking-tighter">Cart</Text>
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
                        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 150 }}
                        showsVerticalScrollIndicator={false}
                    />
                )}

                {cartItems.length > 0 && (
                    <View
                        className="p-6 border-t border-silver-100 bg-white"
                        style={{ paddingBottom: Math.max(insets.bottom, 140) }}
                    >
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-[15px] font-semibold text-brand-secondary">Total Items</Text>
                            <Text className="text-2xl font-bold text-black">
                                {cartItems.reduce((acc, item) => acc + item.delta, 0)}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleCheckout}
                            style={{ backgroundColor: '#004c8c' }}
                            activeOpacity={0.8}
                            className="h-14 rounded-2xl items-center justify-center shadow-lg"
                        >
                            <Text className="text-white text-[15px] font-bold uppercase tracking-widest">Order Now</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}
