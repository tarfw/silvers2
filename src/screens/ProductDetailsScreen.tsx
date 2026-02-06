import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Alert,
    Platform,
    StatusBar
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SecureImage } from '../components/SecureImage';
import { Ionicons } from '@expo/vector-icons';
import { Node } from '../types';
import { useNodes } from '../hooks/useNodes';
import { useAuth } from '../contexts/AuthContext';
import { generateShortId } from '../lib/utils';

const { width } = Dimensions.get('window');

export function ProductDetailsScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
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
            setTimeout(() => setShowSuccess(false), 1500);
        } catch (error) {
            console.error('Add to cart error:', error);
            Alert.alert('Error', 'Failed to add to cart');
        }
    };

    return (
        <View className="flex-1 bg-white">
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 140 }}
            >
                {/* Hero Image */}
                <View className="w-full bg-silver-50 relative">
                    <SecureImage
                        source={{ uri: imageUrl || '' }}
                        style={{ width: width, height: width }}
                        className="bg-silver-100"
                        resizeMode="cover"
                        fallbackComponent={
                            <View style={{ width: width, height: width }} className="bg-silver-100 items-center justify-center">
                                <Ionicons name="image-outline" size={64} color="#D1D1D6" />
                            </View>
                        }
                    />
                </View>

                {/* Content Container */}
                <View className="px-6 pt-8">
                    {/* Title & Badges */}
                    <View className="mb-6">
                        <Text className="text-3xl font-bold text-black leading-tight tracking-tight">
                            {product.title}
                        </Text>
                    </View>

                    {/* Description */}
                    {description && (
                        <View className="mb-8">
                            <Text className="text-[16px] text-[#3A3A3C] leading-[26px] font-normal">
                                {description}
                            </Text>
                        </View>
                    )}

                    {/* Options */}
                    {optionsGroups && Object.entries(optionsGroups).map(([group, optIds]) => (
                        <View key={group} className="mb-8">
                            <Text className="text-[13px] font-bold text-black uppercase tracking-[1px] mb-4">
                                Select {group}
                            </Text>
                            <View className="flex-row flex-wrap gap-3">
                                {optIds.map((id) => {
                                    const title = nodeMap.get(id) || id;
                                    const isSelected = selectedOptions[group] === id;
                                    return (
                                        <TouchableOpacity
                                            key={id}
                                            onPress={() => handleSelectOption(group, id)}
                                            style={{
                                                backgroundColor: isSelected ? '#004c8c' : '#FFFFFF',
                                                borderColor: isSelected ? '#004c8c' : '#E5E5EA',
                                                borderWidth: 1,
                                            }}
                                            className="px-5 py-3 rounded-xl min-w-[30%] items-center"
                                            activeOpacity={0.7}
                                        >
                                            <Text
                                                className={`text-[14px] font-semibold ${isSelected ? 'text-white' : 'text-black'}`}
                                            >
                                                {title}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Bottom Action Bar */}
            <View
                className="absolute bottom-0 left-0 right-0 bg-white border-t border-silver-100 px-6 py-4 shadow-lg"
                style={{ paddingBottom: insets.bottom + 10 }}
            >
                <View className="flex-row items-center gap-4">
                    {/* Quantity Stepper */}
                    <View className="flex-row items-center bg-silver-50 rounded-full h-14 px-1 border border-silver-200">
                        <TouchableOpacity
                            onPress={() => setQuantity(Math.max(1, quantity - 1))}
                            className="w-11 h-full items-center justify-center"
                        >
                            <Ionicons name="remove" size={20} color={quantity > 1 ? "black" : "#C7C7CC"} />
                        </TouchableOpacity>

                        <View className="w-8 items-center">
                            <Text className="text-lg font-bold text-black">{quantity}</Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => setQuantity(quantity + 1)}
                            className="w-11 h-full items-center justify-center"
                        >
                            <Ionicons name="add" size={20} color="black" />
                        </TouchableOpacity>
                    </View>

                    {/* Add to Cart Button */}
                    <TouchableOpacity
                        onPress={handleAddToCart}
                        disabled={showSuccess}
                        activeOpacity={0.8}
                        style={{ backgroundColor: showSuccess ? '#16a34a' : '#004c8c' }}
                        className="flex-1 h-14 rounded-full items-center justify-center shadow-sm flex-row"
                    >
                        {showSuccess ? (
                            <>
                                <Ionicons name="checkmark" size={24} color="white" style={{ marginRight: 8 }} />
                                <Text className="text-white text-[16px] font-bold uppercase tracking-wider">
                                    Added
                                </Text>
                            </>
                        ) : (
                            <Text className="text-white text-[16px] font-bold uppercase tracking-wider">
                                Add to Cart
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}
