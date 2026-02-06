import React, { useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    RefreshControl
} from 'react-native';
import { useNodes } from '../hooks/useNodes';
import { SecureImage } from '../components/SecureImage';
import { Node } from '../types';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

function CollectionCard({ node }: { node: Node }) {
    const navigation = useNavigation<any>();
    const payload = node.payload as any;
    const imageUrl = payload?.image;

    return (
        <TouchableOpacity
            className="w-full h-48 rounded-[40px] mb-6 overflow-hidden bg-silver-50 border border-silver-100"
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Home', { selectedCollectionId: node.id })}
        >
            <SecureImage
                source={{ uri: imageUrl || '' }}
                className="w-full h-full"
                fallbackComponent={<View className="w-full h-full bg-silver-200 items-center justify-center"><Ionicons name="images-outline" size={32} color="#AEAEB2" /></View>}
            />
            <View className="absolute inset-0 bg-black/20 justify-end p-6">
                <Text className="text-white text-3xl font-bold tracking-tight">{node.title}</Text>
                <Text className="text-white/80 text-sm font-medium uppercase tracking-widest mt-1">Explore Collection</Text>
            </View>
        </TouchableOpacity>
    );
}

export function CollectionsScreen() {
    const navigation = useNavigation();
    const { nodes, isLoading, sync } = useNodes();
    const [isRefreshing, setIsRefreshing] = useState(false);

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

    const collectionNodes = nodes.filter(n => n.nodetype === 'collection');

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-6 pt-6 pb-2 mb-4">
                <View className="flex-row justify-between items-center">
                    <Text className="text-4xl font-bold text-black tracking-tighter">Collections</Text>
                    <TouchableOpacity
                        onPress={handleRefresh}
                        className="w-12 h-12 rounded-full bg-silver-50 items-center justify-center border border-silver-100"
                    >
                        <Ionicons name="refresh" size={20} color="#000" />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={collectionNodes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <CollectionCard node={item} />}
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#000" />
                }
                ListEmptyComponent={
                    <View className="py-20 items-center justify-center">
                        <View className="w-20 h-20 bg-silver-50 rounded-full items-center justify-center mb-6 border border-silver-100">
                            <Ionicons name="folder-open-outline" size={32} color="#D1D1D6" />
                        </View>
                        <Text className="text-xl font-bold text-black">No collections yet</Text>
                        <Text className="text-brand-secondary mt-2 text-center px-10">
                            Create collections to organize your catalog.
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}
