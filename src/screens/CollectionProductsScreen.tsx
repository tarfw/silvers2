import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StatusBar, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNodes } from '../hooks/useNodes';
import { SecureImage } from '../components/SecureImage';
import { Node } from '../types';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface ProductWithPrice extends Node {
    price?: number;
    stock?: number;
}

function ProductCard({ node }: { node: ProductWithPrice }) {
    const navigation = useNavigation<any>();
    const payload = node.payload as any;
    const imageUrl = payload?.image;

    return (
        <TouchableOpacity
            onPress={() => navigation.navigate('ProductDetails', { product: node })}
            style={{ borderRadius: 10 }}
            className="w-[47%] bg-white mb-6 overflow-hidden border border-silver-100 shadow-sm"
            activeOpacity={0.9}
        >
            <View className="relative">
                <SecureImage
                    source={{ uri: imageUrl || '' }}
                    style={{ aspectRatio: 1, borderTopLeftRadius: 10, borderTopRightRadius: 10 }}
                    className="w-full bg-silver-50"
                    fallbackComponent={<View style={{ aspectRatio: 1, borderTopLeftRadius: 10, borderTopRightRadius: 10 }} className="w-full bg-silver-100" />}
                />
            </View>
            <View className="p-4">
                <Text className="text-[15px] font-bold text-black leading-tight mb-1" numberOfLines={2}>
                    {node.title}
                </Text>
                <Text className="text-[11px] font-bold text-brand-secondary uppercase tracking-widest">
                    {node.nodetype}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

export function CollectionProductsScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const { collectionId, collectionTitle } = route.params as { collectionId: string; collectionTitle: string };
    const { sync } = useNodes();
    const { db } = useAuth();
    const [products, setProducts] = useState<ProductWithPrice[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadCollectionProducts = useCallback(async () => {
        if (!db) return;
        try {
            // We get all products and filter locally for now to correctly handle JSON payload
            // In a larger app, we'd use JSON_CONTAINS or similar if supported by the sqlite version
            const rows = await db.all(`
                SELECT n.*, p.price, p.stock
                FROM nodes n
                LEFT JOIN points p ON n.id = p.noderef
                WHERE n.nodetype = 'product'
            `) as any[];

            const parsed = rows.map(r => ({
                ...r,
                payload: r.payload ? JSON.parse(r.payload) : null,
                price: r.price,
                stock: r.stock ? parseInt(r.stock) : 0
            }));

            // Filter products that have the current collectionId in their payload.collections array
            const filtered = parsed.filter(p => {
                const collections = p.payload?.collections;
                return Array.isArray(collections) && collections.includes(collectionId);
            });

            setProducts(filtered);
        } catch (error) {
            console.error('Error loading collection products:', error);
        }
    }, [db, collectionId]);

    useFocusEffect(
        useCallback(() => {
            loadCollectionProducts();
        }, [loadCollectionProducts])
    );

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await sync();
            await loadCollectionProducts();
        } catch (e) {
            console.error(e);
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <View className="flex-1 bg-white">
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
            <View className="flex-1" style={{ paddingTop: insets.top }}>
                {/* Header */}
                <View className="px-6 pt-2 pb-4 flex-row items-center border-b border-silver-100">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="mr-4 w-10 h-10 items-center justify-center rounded-full bg-silver-50"
                    >
                        <Ionicons name="chevron-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-2xl font-bold text-black tracking-tight" numberOfLines={1}>
                            {collectionTitle}
                        </Text>
                        <Text className="text-[10px] font-bold text-brand-secondary uppercase tracking-[2px]">
                            Collection View
                        </Text>
                    </View>
                </View>

                <FlatList
                    data={products}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    renderItem={({ item }) => <ProductCard node={item} />}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 }}
                    columnWrapperStyle={{ justifyContent: 'space-between' }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#000" />
                    }
                    ListEmptyComponent={
                        <View className="py-20 items-center justify-center">
                            <View className="w-20 h-20 bg-silver-50 rounded-full items-center justify-center mb-6 border border-silver-100">
                                <Ionicons name="sparkles-outline" size={32} color="#D1D1D6" />
                            </View>
                            <Text className="text-black text-xl font-bold">No products found</Text>
                            <Text className="text-brand-secondary mt-2 text-center px-10">
                                This collection doesn't have any products yet.
                            </Text>
                        </View>
                    }
                />
            </View>
        </View>
    );
}
