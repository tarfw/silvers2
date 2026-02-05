import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    RefreshControl
} from 'react-native';
import { useNodes } from '../hooks/useNodes';
import { SecureImage } from '../components/SecureImage';
import { Node } from '../types';

const Colors = {
    background: '#FFFFFF',
    text: '#000000',
    textSecondary: '#636366',
    separator: '#F2F2F7',
};

function CollectionItem({ node }: { node: Node }) {
    const payload = node.payload as any;
    const imageUrl = payload?.image;

    return (
        <TouchableOpacity style={styles.collectionCard} activeOpacity={0.8}>
            <SecureImage
                source={{ uri: imageUrl || '' }}
                style={styles.collectionImage}
                fallbackComponent={<View style={styles.imagePlaceholder} />}
            />
            <View style={styles.overlay}>
                <Text style={styles.collectionTitle}>{node.title}</Text>
            </View>
        </TouchableOpacity>
    );
}

export function CollectionsScreen() {
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
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Collections</Text>
            </View>

            <FlatList
                data={collectionNodes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <CollectionItem node={item} />}
                contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            {isLoading ? 'Loading...' : 'No collections found'}
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
    list: {
        padding: 20,
    },
    collectionCard: {
        height: 180,
        borderRadius: 16,
        marginBottom: 20,
        overflow: 'hidden',
        backgroundColor: '#F2F2F7',
    },
    collectionImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#E5E5EA',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'flex-end',
        padding: 20,
    },
    collectionTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '700',
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
