import React, { useState, useMemo } from 'react';

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Alert, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SecureImage } from '../components/SecureImage';
import { Ionicons } from '@expo/vector-icons';
import { Node } from '../types';
import { useNodes } from '../hooks/useNodes';
import { useAuth } from '../contexts/AuthContext';
import { generateShortId } from '../lib/utils';

const { width } = Dimensions.get('window');

const Colors = {
    background: '#FFFFFF',
    text: '#000000',
    textSecondary: '#636366',
    primary: '#000000',
    separator: '#F2F2F7',
    surface: '#F9F9FB',
};

export function ProductDetailsScreen() {
    const route = useRoute();
    const navigation = useNavigation();
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

    // Create a fast lookup map for node titles
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

        // Validate all option groups have a selection
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
            const orderId = `cart_${user.id}`; // Stream ID for the cart
            const opcode = 401; // Cart events

            // Ensure the stream exists to satisfy foreign key constraint
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
                eventId,
                orderId,
                opcode,
                user.id, // refid carries user id as per request
                quantity, // delta carries qty
                eventPayload, // payload carries product name and options
                'cart', // scope
                new Date().toISOString()
            ]);

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);

        } catch (error: any) {
            console.error('Add to cart error:', error);
            Alert.alert('Error', 'Failed to add to cart');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{product.title}</Text>
                <TouchableOpacity
                    onPress={() => (navigation.navigate as any)('MainTabs', { screen: 'Cart' })}
                    style={styles.cartButton}
                >
                    <Ionicons name="cart-outline" size={24} color={Colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <SecureImage
                    source={{ uri: imageUrl || '' }}
                    style={styles.mainImage}
                    fallbackComponent={<View style={styles.imagePlaceholder} />}
                />

                <View style={styles.infoContainer}>
                    <View style={styles.titleRow}>
                        <Text style={styles.productTitle}>{product.title}</Text>
                        <Text style={styles.productCode}>
                            {product.universalcode ? `#${product.universalcode}` : ''}
                        </Text>
                    </View>

                    {description && (
                        <View style={styles.section}>
                            <Text style={styles.descriptionText}>{description}</Text>
                        </View>
                    )}

                    {optionsGroups && Object.entries(optionsGroups).map(([group, optIds]) => (
                        <View key={group} style={styles.section}>
                            <Text style={styles.sectionTitle}>{group}</Text>
                            <View style={styles.optionsGrid}>
                                {optIds.map((id) => {
                                    const title = nodeMap.get(id) || id;
                                    const isSelected = selectedOptions[group] === id;
                                    return (
                                        <TouchableOpacity
                                            key={id}
                                            style={[
                                                styles.optionChip,
                                                isSelected && styles.optionChipSelected
                                            ]}
                                            onPress={() => handleSelectOption(group, id)}
                                        >
                                            <Text style={[
                                                styles.optionText,
                                                isSelected && styles.optionTextSelected
                                            ]}>
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

            <View style={styles.footerContainer}>
                {showSuccess && (
                    <View style={styles.successBar}>
                        <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                        <Text style={styles.successText}>Added to cart!</Text>
                        <TouchableOpacity onPress={() => (navigation.navigate as any)('MainTabs', { screen: 'Cart' })}>
                            <Text style={styles.viewCartLink}>View Cart</Text>
                        </TouchableOpacity>
                    </View>
                )}
                <View style={styles.footer}>
                    <View style={styles.quantityContainer}>
                        <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => setQuantity(Math.max(1, quantity - 1))}
                        >
                            <Ionicons name="remove" size={20} color={Colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{quantity}</Text>
                        <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => setQuantity(quantity + 1)}
                        >
                            <Ionicons name="add" size={20} color={Colors.text} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
                        <Text style={styles.addToCartText}>Add to Cart</Text>
                    </TouchableOpacity>
                </View>
            </View>
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
        paddingHorizontal: 8,
        height: 56,
        borderBottomWidth: 1,
        borderBottomColor: Colors.separator,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cartButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: Colors.text,
        flex: 1,
        textAlign: 'center',
    },
    mainImage: {
        width: width,
        aspectRatio: 1,
        backgroundColor: '#F9F9FB',
    },
    imagePlaceholder: {
        width: width,
        aspectRatio: 1,
        backgroundColor: '#F2F2F7',
    },
    infoContainer: {
        padding: 20,
    },
    titleRow: {
        marginBottom: 20,
    },
    productTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
    },
    productCode: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    descriptionText: {
        fontSize: 16,
        lineHeight: 24,
        color: Colors.textSecondary,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.separator,
        backgroundColor: Colors.surface,
    },
    optionChipSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    optionText: {
        fontSize: 14,
        color: Colors.text,
        fontWeight: '500',
    },
    optionTextSelected: {
        color: '#FFFFFF',
    },
    footerContainer: {
        borderTopWidth: 1,
        borderTopColor: Colors.separator,
    },
    successBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2FBF4',
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 8,
    },
    successText: {
        color: '#1A1A1A',
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    viewCartLink: {
        color: Colors.text,
        fontSize: 14,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    footer: {
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 20 : 30,
        flexDirection: 'row',
        gap: 12,
    },

    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 16,
        paddingHorizontal: 8,
        height: 56,
    },
    quantityButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quantityText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        minWidth: 30,
        textAlign: 'center',
    },
    addToCartButton: {
        flex: 1,
        backgroundColor: Colors.primary,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addToCartText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
