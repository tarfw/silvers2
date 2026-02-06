import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ScrollView,
    Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNodes } from '../hooks/useNodes';
import { SecureImage } from '../components/SecureImage';
import { Node } from '../types';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Input } from '../components/ui/Input';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { BlurView } from 'expo-blur';

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
            className="w-[47%] bg-white rounded-[10px] mb-6 overflow-hidden border border-silver-100 shadow-sm"
            activeOpacity={0.9}
            onPress={() => navigation.navigate('ProductDetails', { product: node })}
        >
            <View className="relative">
                <SecureImage
                    source={{ uri: imageUrl || '' }}
                    style={{ aspectRatio: 1 }}
                    className="w-full bg-silver-50"
                    fallbackComponent={<View style={{ aspectRatio: 1 }} className="w-full bg-silver-100" />}
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

export function ProductsScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { nodes, isLoading, sync } = useNodes();
    const { db, user } = useAuth();
    const [products, setProducts] = useState<ProductWithPrice[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const loadProductsWithPrices = useCallback(async () => {
        if (!db) return;
        try {
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
            setProducts(parsed);
        } catch (error) {
            console.error('Error loading products with prices:', error);
        }
    }, [db]);

    useFocusEffect(
        useCallback(() => {
            loadProductsWithPrices();
        }, [loadProductsWithPrices])
    );

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await sync();
            await loadProductsWithPrices();
        } catch (e) {
            console.error(e);
        } finally {
            setIsRefreshing(false);
        }
    };

    const collections = nodes.filter(n => n.nodetype === 'collection');

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory
            ? p.parentid === selectedCategory || p.universalcode.includes(selectedCategory)
            : true;
        return matchesSearch && matchesCategory;
    });

    const featuredProducts = products.slice(0, 5);

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <View className="px-6 pt-2 pb-0">
                {/* Header Area */}
                <View className="flex-row justify-between items-center mb-4">
                    <View>
                        <Text className="text-[11px] font-bold text-brand-secondary uppercase tracking-[2px] mb-0.5">SKJ Silvers</Text>
                        <Text className="text-3xl font-bold text-black tracking-tighter">Collections</Text>
                    </View>
                    <TouchableOpacity
                        onPress={handleRefresh}
                        className="w-12 h-12 rounded-full bg-silver-50 items-center justify-center border border-silver-100"
                    >
                        <Ionicons name="refresh" size={20} color="#000" />
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <View className="mb-4">
                    <Input
                        placeholder="Search our catalogue..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        icon="search"
                        containerClassName="h-12 rounded-xl bg-silver-50 border-silver-100"
                    />
                </View>

                {/* Horizontal Collections */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mb-4 -mx-6 px-6"
                >
                    <TouchableOpacity
                        onPress={() => setSelectedCategory(null)}
                        style={{
                            backgroundColor: !selectedCategory ? '#004c8c' : '#F2F2F7',
                            borderColor: !selectedCategory ? '#004c8c' : '#F2F2F7'
                        }}
                        className="mr-3 px-6 py-3 rounded-[20px] border"
                    >
                        <Text className={`font-bold text-[13px] ${!selectedCategory ? 'text-white' : 'text-[#8E8E93]'}`}>All</Text>
                    </TouchableOpacity>
                    {collections.map(col => (
                        <TouchableOpacity
                            key={col.id}
                            onPress={() => setSelectedCategory(col.id)}
                            style={{
                                backgroundColor: selectedCategory === col.id ? '#004c8c' : '#F2F2F7',
                                borderColor: selectedCategory === col.id ? '#004c8c' : '#F2F2F7'
                            }}
                            className="mr-3 px-6 py-3 rounded-[20px] border"
                        >
                            <Text className={`font-bold text-[13px] ${selectedCategory === col.id ? 'text-white' : 'text-[#8E8E93]'}`}>
                                {col.title}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={filteredProducts}
                keyExtractor={(item) => item.id}
                numColumns={2}
                renderItem={({ item }) => <ProductCard node={item} />}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 0, paddingBottom: 220 }}
                columnWrapperStyle={{ justifyContent: 'space-between' }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#000" />
                }
                ListHeaderComponent={
                    !searchQuery && !selectedCategory && featuredProducts.length > 0 ? (
                        <View className="mb-6">
                            <View className="flex-row items-center justify-between mb-4 px-1">
                                <Text className="text-xl font-bold text-black tracking-tight">Featured Pieces</Text>
                                <TouchableOpacity>
                                    <Text className="text-[12px] font-bold text-[#004c8c] uppercase tracking-wider">See All</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                className="-mx-6 px-6"
                                decelerationRate="fast"
                                snapToInterval={width * 0.72 + 16}
                                snapToAlignment="start"
                            >
                                {featuredProducts.map(p => (
                                    <TouchableOpacity
                                        key={p.id}
                                        onPress={() => (navigation as any).navigate('ProductDetails', { product: p })}
                                        style={{ width: width * 0.72 }}
                                        className="mr-4 bg-white rounded-[10px] overflow-hidden border border-silver-100 shadow-sm"
                                        activeOpacity={0.9}
                                    >
                                        <View className="relative">
                                            <SecureImage
                                                source={{ uri: (p.payload as any)?.image }}
                                                style={{ aspectRatio: 1 }}
                                                className="w-full bg-silver-50"
                                            />
                                            <View
                                                style={{ backgroundColor: '#004c8c' }}
                                                className="absolute top-5 left-5 px-3 py-1.5 shadow-lg"
                                            >
                                                <Text className="text-[10px] font-bold text-white uppercase tracking-widest">New Arrival</Text>
                                            </View>
                                        </View>
                                        <View className="p-6">
                                            <Text className="text-lg font-bold text-black mb-1" numberOfLines={1}>{p.title}</Text>
                                            <Text className="text-[12px] font-bold text-brand-secondary uppercase tracking-[1px]">Limited Collection</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                                <View className="w-6" />
                            </ScrollView>

                            <View className="mt-8 mb-4 px-1">
                                <Text className="text-xl font-bold text-black tracking-tight">Explore Catalogue</Text>
                                <Text className="text-[12px] font-medium text-brand-secondary mt-0.5">Discover our classic silver essentials</Text>
                            </View>
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    <View className="py-20 items-center justify-center">
                        <View className="w-20 h-20 bg-silver-50 rounded-full items-center justify-center mb-6 border border-silver-100">
                            <Ionicons name="sparkles-outline" size={32} color="#D1D1D6" />
                        </View>
                        <Text className="text-black text-xl font-bold">No products found</Text>
                        <Text className="text-brand-secondary mt-2 text-center px-10">
                            Try adjusting your filters or search terms.
                        </Text>
                    </View>
                }
            />
        </View>
    );
}
