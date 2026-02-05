import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { SecureImage } from '../components/SecureImage';
import { useFocusEffect } from '@react-navigation/native';


const Colors = {
    background: '#FFFFFF',
    text: '#000000',
    textSecondary: '#636366',
    primary: '#000000',
    separator: '#F2F2F7',
    surface: '#F9F9FB',
    danger: '#FF3B30',
};

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
    const [cartItems, setCartItems] = useState<CartEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadCart = useCallback(async () => {
        if (!db || !user) return;
        setIsLoading(true);
        try {
            // Fetch cart events (opcode 401)
            const rows = await db.all(
                'SELECT * FROM orevents WHERE opcode = ? ORDER BY ts DESC',
                [401]
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

    const renderItem = ({ item }: { item: CartEvent }) => {
        const payload = JSON.parse(item.payload);
        const options = payload.options || {};
        const optionsString = Object.entries(options)
            .map(([group, val]) => `${group}: ${val}`)
            .join(', ');

        return (
            <View style={styles.cartItem}>
                <SecureImage
                    source={{ uri: payload.image || '' }}
                    style={styles.itemImage}
                    fallbackComponent={<View style={styles.imagePlaceholder} />}
                />
                <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>{payload.name}</Text>
                    {optionsString ? (
                        <Text style={styles.itemOptions} numberOfLines={1}>{optionsString}</Text>
                    ) : null}
                    <View style={styles.itemFooter}>
                        <Text style={styles.itemQuantity}>Qty: {item.delta}</Text>
                        <TouchableOpacity onPress={() => handleRemoveItem(item.id)}>
                            <Text style={styles.removeText}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    if (isLoading && cartItems.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Cart</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color={Colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Cart</Text>
            </View>


            {cartItems.length === 0 ? (
                <View style={styles.emptyContent}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="cart-outline" size={48} color="#C7C7CC" />
                    </View>
                    <Text style={styles.emptyTitle}>Your cart is empty</Text>
                    <Text style={styles.emptySubtitle}>Start adding items to your cart</Text>
                </View>
            ) : (
                <FlatList
                    data={cartItems}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 100,
    },
    emptyIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 16,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    cartItem: {
        flexDirection: 'row',
        paddingVertical: 16,
        alignItems: 'center',
    },
    itemImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: Colors.surface,
    },
    imagePlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#F2F2F7',
    },
    itemInfo: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    itemName: {
        fontSize: 17,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 4,
    },
    itemOptions: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 8,
    },
    itemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemQuantity: {
        fontSize: 15,
        fontWeight: '500',
        color: Colors.text,
    },
    removeText: {
        fontSize: 14,
        color: Colors.danger,
        fontWeight: '500',
    },
    separator: {
        height: 1,
        backgroundColor: Colors.separator,
    },
});
