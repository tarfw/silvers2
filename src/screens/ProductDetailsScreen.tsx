import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SecureImage } from '../components/SecureImage';
import { Ionicons } from '@expo/vector-icons';
import { Node } from '../types';
import { useNodes } from '../hooks/useNodes';
import { useAuth } from '../contexts/AuthContext';
import { generateShortId } from '../lib/utils';
import { Button } from '../components/ui/Button';

const { width } = Dimensions.get('window');

export function ProductDetailsScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { product } = route.params as { product: Node };
    const { nodes } = useNodes();
    const { user, db } = useAuth();

    const [quantity, setQuantity] = useState(1);
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
    const [showSuccess, setShowSuccess] = useState(false);

    const payload = product.payload as any;
    const imageUrl = payload?.image;
    const description = payload?.description;
    const optionsGroups = payload?.options as Record<string, string[]> | undefined;

    const nodeMap = useMemo(() => {
        const map = new Map<string, string>();
        nodes.forEach(node => map.set(node.id, node.title));
        return map;
    }, [nodes]);

    const handleSelectOption = (group: string, optionId: string) => {
        setSelectedOptions(prev => ({
            ...prev,
            [group]: optionId
        }));
    };

    const handleAddToCart = async () => {
        if (!user || !db) {
            Alert.alert('Error', 'Please sign in to add items to cart');
            return;
        }

        if (optionsGroups) {
            const missingGroups = Object.keys(optionsGroups).filter(group => !selectedOptions[group]);
            if (missingGroups.length > 0) {
                Alert.alert('Selection Required', `Please select: ${missingGroups.join(', ')}`);
                return;
            }
        }

        const selectedOptionsText = Object.entries(selectedOptions).reduce((acc, [group, id]) => {
            acc[group] = nodeMap.get(id) || id;
            return acc;
        }, {} as Record<string, string>);

        try {
            const eventId = generateShortId();
            const orderId = `cart_${user.id}`;
            const opcode = 401;

            await db.run(`
                INSERT INTO streams (id, scope, createdby, createdat)
                SELECT ?, ?, ?, ?
                WHERE NOT EXISTS (SELECT 1 FROM streams WHERE id = ?)
            `, [orderId, 'cart', user.id, new Date().toISOString(), orderId]);

            const eventPayload = JSON.stringify({
                name: product.title,
                productId: product.id,
                options: selectedOptionsText,
                image: imageUrl
            });

            await db.run(`
                INSERT INTO orevents (id, streamid, opcode, refid, delta, payload, scope, ts)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                eventId, orderId, opcode, user.id, quantity, eventPayload, 'cart', new Date().toISOString()
            ]);

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error('Add to cart error:', error);
            Alert.alert('Error', 'Failed to add to cart');
        }
    };

    return (
        <View className="flex-1 bg-white">
            {/* Transparent Header */}
            <SafeAreaView className="absolute top-0 left-0 right-0 z-50">
                <View className="flex-row items-center justify-between px-4 h-14">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="w-10 h-10 items-center justify-center bg-white/80 rounded-full shadow-sm"
                    >
                        <Ionicons name="chevron-back" size={24} color="#000" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => (navigation.navigate as any)('MainTabs', { screen: 'Cart' })}
                        className="w-10 h-10 items-center justify-center bg-white/80 rounded-full shadow-sm"
                    >
                        <Ionicons name="cart-outline" size={24} color="#000" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                {/* Hero Image Section */}
                <View className="relative bg-silver-50">
                    <SecureImage
                        source={{ uri: imageUrl || '' }}
                        className="w-full aspect-[4/5]"
                        fallbackComponent={<View className="w-full aspect-[4/5] bg-silver-200 items-center justify-center"><Ionicons name="image-outline" size={64} color="#AEAEB2" /></View>}
                    />
                    {/* Shadow overlay for bottom fade if needed */}
                </View>

                <View className="px-6 py-8">
                    {/* Title & Badge Section */}
                    <View className="flex-row justify-between items-start mb-4">
                        <View className="flex-1 mr-4">
                            <Text className="text-3xl font-bold text-black tracking-tight leading-tight">{product.title}</Text>
                            {product.universalcode ? (
                                <View className="mt-2 bg-silver-100 self-start px-2 py-1 rounded-md">
                                    <Text className="text-[10px] font-bold text-brand-secondary uppercase tracking-widest">{product.universalcode}</Text>
                                </View>
                            ) : null}
                        </View>
                    </View>

                    {/* Description Section */}
                    {description && (
                        <View className="mb-10">
                            <Text className="text-[11px] font-bold text-brand-secondary uppercase tracking-[2.5px] mb-3">About</Text>
                            <Text className="text-base text-brand-secondary leading-[26px] font-medium">{description}</Text>
                        </View>
                    )}

                    {/* Options Mapping */}
                    {optionsGroups && Object.entries(optionsGroups).map(([group, optIds]) => (
                        <View key={group} className="mb-10">
                            <Text className="text-[11px] font-bold text-brand-secondary uppercase tracking-[2.5px] mb-4">{group}</Text>
                            <View className="flex-row flex-wrap gap-2.5">
                                {optIds.map((id) => {
                                    const title = nodeMap.get(id) || id;
                                    const isSelected = selectedOptions[group] === id;
                                    return (
                                        <TouchableOpacity
                                            key={id}
                                            className={`px-6 py-3.5 rounded-2xl border ${isSelected ? 'bg-black border-black' : 'bg-white border-silver-200'}`}
                                            onPress={() => handleSelectOption(group, id)}
                                        >
                                            <Text className={`text-[13px] font-bold uppercase tracking-wider ${isSelected ? 'text-white' : 'text-black'}`}>
                                                {title}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    ))}

                    {/* Extra space for scrolling past the floating bar */}
                    <View className="h-32" />
                </View>
            </ScrollView>

            {/* Bottom Floating Action Bar */}
            <SafeAreaView className="absolute bottom-0 left-0 right-0">
                {showSuccess && (
                    <View className="mx-6 mb-4 bg-green-500 flex-row items-center px-5 py-4 rounded-3xl shadow-lg border border-green-400">
                        <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                        <Text className="text-white text-sm font-bold flex-1 ml-3">Added to cart successfully</Text>
                        <TouchableOpacity onPress={() => (navigation.navigate as any)('MainTabs', { screen: 'Cart' })}>
                            <Text className="text-white text-sm font-bold underline">View</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View className="mx-6 mb-6 p-4 bg-white rounded-[40px] shadow-2xl shadow-black/30 border border-silver-100 flex-row items-center">
                    <View className="flex-row items-center bg-silver-50 rounded-full px-2 h-14 w-32 border border-silver-100">
                        <TouchableOpacity
                            className="w-10 h-10 items-center justify-center"
                            onPress={() => setQuantity(Math.max(1, quantity - 1))}
                        >
                            <Ionicons name="remove" size={18} color="#000" />
                        </TouchableOpacity>
                        <Text className="flex-1 text-lg font-bold text-black text-center">{quantity}</Text>
                        <TouchableOpacity
                            className="w-10 h-10 items-center justify-center"
                            onPress={() => setQuantity(quantity + 1)}
                        >
                            <Ionicons name="add" size={18} color="#000" />
                        </TouchableOpacity>
                    </View>

                    <View className="flex-1 ml-4">
                        <Button
                            label="Add to Cart"
                            onPress={handleAddToCart}
                            size="lg"
                            className="w-full"
                        />
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}
