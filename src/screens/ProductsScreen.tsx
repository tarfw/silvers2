import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    RefreshControl,
    TextInput
} from 'react-native';
import { useNodes } from '../hooks/useNodes';
import { SecureImage } from '../components/SecureImage';
import { Node } from '../types';
import { useNavigation } from '@react-navigation/native';

const Colors = {
    background: '#FFFFFF',
    text: '#000000',
    textSecondary: '#636366',
    separator: '#F2F2F7',
    primary: '#000000',
};

function ProductItem({ node }: { node: Node }) {
    const navigation = useNavigation<any>();
    const payload = node.payload as any;
    const imageUrl = payload?.image;

    return (
        <TouchableOpacity
            style={styles.productCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ProductDetails', { product: node })}
        >
            <SecureImage
                source={{ uri: imageUrl || '' }}
                style={styles.productImage}
                fallbackComponent={<View style={styles.imagePlaceholder} />}
            />
            <View style={styles.productInfo}>
                <Text style={styles.productTitle} numberOfLines={1}>{node.title}</Text>
                <Text style={styles.productPrice}>
                    {node.universalcode ? `#${node.universalcode}` : 'No code'}
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
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Products</Text>
                <View style={styles.searchBar}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search products..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={Colors.textSecondary}
                    />
                </View>
            </View>

            <FlatList
                data={productNodes}
                keyExtractor={(item) => item.id}
                numColumns={2}
                renderItem={({ item }) => <ProductItem node={item} />}
                contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
                columnWrapperStyle={styles.columnWrapper}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            {isLoading ? 'Loading...' : 'No products found'}
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: Colors.text,
        letterSpacing: -0.5,
    },
    searchBar: {
        backgroundColor: '#F2F2F7',
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 40,
        justifyContent: 'center',
    },
    searchInput: {
        fontSize: 16,
        color: Colors.text,
    },
    list: {
        padding: 10,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    productCard: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F2F2F7',
    },
    productImage: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#F9F9FB',
    },
    imagePlaceholder: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#F2F2F7',
    },
    productInfo: {
        padding: 10,
    },
    productTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 2,
    },
    productPrice: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: Colors.textSecondary,
        fontSize: 16,
    },
});
