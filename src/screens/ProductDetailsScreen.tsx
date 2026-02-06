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
    const [isAdded, setIsAdded] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    const payload = product.payload as any;
    const imageUrl = payload?.image;
    const description = payload?.description;
    const optionsGroups = payload?.options as Record<string, string[]> | undefined;
    const categoryId = payload?.category as string | undefined;
    const collectionIds = payload?.collections as string[] | undefined;
    const vendorId = payload?.vendor as string | undefined;

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
        setIsAdded(false);
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

        setIsAdding(true);
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

            setIsAdded(true);
        } catch (error) {
            console.error('Add to cart error:', error);
            Alert.alert('Error', 'Failed to add to cart');
        } finally {
            setIsAdding(false);
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

                    {/* Floating Back Button */}
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={{ top: insets.top + 10 }}
                        className="absolute left-6 w-12 h-12 rounded-full bg-white/90 items-center justify-center shadow-lg border border-white/20"
                        activeOpacity={0.8}
                    >
                        <Ionicons name="chevron-back" size={24} color="#000" />
                    </TouchableOpacity>
                </View>

                {/* Content Container */}
                <View className="px-6 pt-8">
                    {/* Category & Collections */}
                    <View className="flex-row flex-wrap gap-2 mb-3">
                        {categoryId && (
                            <View className="bg-silver-100 px-3 py-1 rounded-full border border-silver-200">
                                <Text className="text-[10px] font-bold text-brand-secondary uppercase tracking-wider">
                                    {nodeMap.get(categoryId) || 'Category'}
                                </Text>
                            </View>
                        )}
                        {collectionIds?.map(id => (
                            <View key={id} className="bg-brand-secondary/10 px-3 py-1 rounded-full">
                                <Text className="text-[10px] font-bold text-brand-secondary uppercase tracking-wider">
                                    {nodeMap.get(id) || id}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Title & Vendor */}
                    <View className="mb-6">
                        <Text className="text-3xl font-bold text-black leading-tight tracking-tight mb-2">
                            {product.title}
                        </Text>
                        {vendorId && (
                            <View className="flex-row items-center">
                                <Ionicons name="business-outline" size={14} color="#8E8E93" />
                                <Text className="text-[13px] font-semibold text-brand-secondary ml-1.5 uppercase tracking-wide">
                                    by {nodeMap.get(vendorId) || 'Unknown Vendor'}
                                </Text>
                            </View>
                        )}
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
                <View className="flex-row items-center gap-3">
                    {/* Quantity Stepper */}
                    <View className="flex-row items-center bg-silver-50 rounded-full h-14 px-1 border border-silver-200">
                        <TouchableOpacity
                            onPress={() => {
                                setQuantity(Math.max(1, quantity - 1));
                            }}
                            className="w-11 h-full items-center justify-center"
                        >
                            <Ionicons name="remove" size={20} color={quantity > 1 ? "black" : "#C7C7CC"} />
                        </TouchableOpacity>

                        <View className="w-8 items-center">
                            <Text className="text-lg font-bold text-black">{quantity}</Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => {
                                setQuantity(quantity + 1);
                            }}
                            className="w-11 h-full items-center justify-center"
                        >
                            <Ionicons name="add" size={20} color="black" />
                        </TouchableOpacity>
                    </View>

                    {/* Add to Cart Button */}
                    <TouchableOpacity
                        onPress={handleAddToCart}
                        disabled={isAdding}
                        activeOpacity={0.8}
                        style={{ backgroundColor: isAdding ? '#E5E5EA' : '#004c8c' }}
                        className="flex-1 h-14 rounded-full items-center justify-center shadow-sm flex-row"
                    >
                        <Text className="text-white text-[15px] font-bold uppercase tracking-wider">
                            {isAdding ? 'Adding...' : 'Add to Cart'}
                        </Text>
                    </TouchableOpacity>

                    {/* Go to Cart - Secondary Action */}
                    {isAdded && (
                        <TouchableOpacity
                            onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Cart' })}
                            className="w-14 h-14 rounded-full bg-silver-100 items-center justify-center border border-silver-200"
                            activeOpacity={0.7}
                        >
                            <Ionicons name="cart" size={24} color="#004c8c" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
}
