import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { SecureImage } from '../components/SecureImage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { generateShortId } from '../lib/utils';



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
    const navigation = useNavigation<any>();
    const [cartItems, setCartItems] = useState<CartEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);


    const loadCart = useCallback(async () => {
        if (!db || !user) return;
        setIsLoading(true);
        try {
            // Fetch cart events (opcode 401)
            const rows = await db.all(
                'SELECT * FROM orevents WHERE opcode = ? AND refid = ? ORDER BY ts DESC',
                [401, user.id]
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

    const handleCheckout = () => {
        if (cartItems.length === 0) return;
        navigation.navigate('CheckoutAddress', { cartItems });
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

            {cartItems.length > 0 && (
                <View style={styles.footer}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total Items</Text>
                        <Text style={styles.totalValue}>
                            {cartItems.reduce((acc, item) => acc + item.delta, 0)}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.checkoutButton}
                        onPress={handleCheckout}
                    >
                        <Text style={styles.checkoutText}>Order Now</Text>
                    </TouchableOpacity>
                </View>
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
    footer: {
        padding: 24,
        paddingBottom: 110, // Avoid overlapping with tab bar
        borderTopWidth: 1,
        borderTopColor: Colors.separator,
        backgroundColor: Colors.background,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    totalLabel: {
        fontSize: 16,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    totalValue: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
    },
    checkoutButton: {
        backgroundColor: Colors.primary,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledButton: {
        opacity: 0.6,
    },
    checkoutText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    addressSection: {
        marginTop: 32,
        paddingBottom: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    addressList: {
        gap: 12,
    },
    addressItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    selectedAddress: {
        borderColor: Colors.primary,
        backgroundColor: '#FFF',
    },
    addressContent: {
        flex: 1,
        marginLeft: 12,
    },
    addressText: {
        fontSize: 15,
        color: Colors.text,
        lineHeight: 20,
    },
    defaultLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.primary,
        marginTop: 4,
        textTransform: 'uppercase',
    },
    addNewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    addNewText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.primary,
        marginLeft: 8,
    },
    newAddressContainer: {
        gap: 16,
    },
    inputWrapper: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 12,
        alignItems: 'flex-start',
    },
    inputIcon: {
        marginTop: 8,
    },
    addressInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: Colors.text,
        minHeight: 80,
        textAlignVertical: 'top',
        padding: 0,
    },
    defaultCheckbox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 4,
    },
    checkboxLabel: {
        fontSize: 14,
        color: Colors.text,
        marginLeft: 10,
    },
    cancelNewButton: {
        padding: 12,
        alignItems: 'center',
    },
    cancelNewText: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
});

