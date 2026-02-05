import React, { useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    RefreshControl,
} from 'react-native';
import { useNodes } from '../hooks/useNodes';
import { SecureImage } from '../components/SecureImage';
import { Node } from '../types';
import { useNavigation } from '@react-navigation/native';
import { Input } from '../components/ui/Input';
import { Ionicons } from '@expo/vector-icons';

function ProductItem({ node }: { node: Node }) {
    const navigation = useNavigation<any>();
    const payload = node.payload as any;
    const imageUrl = payload?.image;

    return (
        <TouchableOpacity
            className="w-[48%] bg-white rounded-2xl mb-4 border border-silver-100 overflow-hidden"
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ProductDetails', { product: node })}
        >
            <SecureImage
                source={{ uri: imageUrl || '' }}
                className="w-full aspect-square bg-silver-50"
                fallbackComponent={<View className="w-full aspect-square bg-silver-100" />}
            />
            <View className="p-3">
                <Text className="text-sm font-bold text-black" numberOfLines={1}>{node.title}</Text>
                <Text className="text-[11px] text-brand-secondary font-medium tracking-wide mt-0.5">
                    {node.universalcode ? `#${node.universalcode}` : 'NO CODE'}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

export function ProductsScreen() {
    const { nodes, isLoading, sync } = useNodes();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await sync();
        } catch (e) {
            console.error(e);
        } finally {
            setIsRefreshing(false);
        }
    };

    const productNodes = nodes.filter(n =>
        n.nodetype === 'product' &&
        n.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-5 pt-4 pb-2">
                <View className="flex-row justify-between items-end mb-4">
                    <Text className="text-4xl font-bold text-black tracking-tight">Silvers</Text>
                    <TouchableOpacity onPress={() => sync()} className="p-2">
                        <Ionicons name="sync-outline" size={24} color="#000" />
                    </TouchableOpacity>
                </View>
                <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    icon="search"
                    containerClassName="mb-2"
                />
            </View>

            <FlatList
                data={productNodes}
                keyExtractor={(item) => item.id}
                numColumns={2}
                renderItem={({ item }) => <ProductItem node={item} />}
                contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
                columnWrapperStyle={{ justifyContent: 'space-between' }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#000" />
                }
                ListEmptyComponent={
                    <View className="py-20 items-center justify-center">
                        <Ionicons name="cube-outline" size={48} color="#D1D1D6" />
                        <Text className="text-silver-600 mt-4 text-base font-medium">
                            {isLoading ? 'Fetching products...' : 'No products found'}
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}
