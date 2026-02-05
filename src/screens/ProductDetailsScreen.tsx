import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SecureImage } from '../components/SecureImage';
import { Ionicons } from '@expo/vector-icons';
import { Node } from '../types';
import { useNodes } from '../hooks/useNodes';

const { width } = Dimensions.get('window');

const Colors = {
    background: '#FFFFFF',
    text: '#000000',
    textSecondary: '#636366',
    primary: '#000000',
    separator: '#F2F2F7',
};

export function ProductDetailsScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { product } = route.params as { product: Node };
    const { nodes } = useNodes();

    const payload = product.payload as any;
    const imageUrl = payload?.image;
    const description = payload?.description;
    const options = payload?.options as Record<string, string[]> | undefined;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{product.title}</Text>
                <View style={{ width: 44 }} />
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

                    {options && Object.entries(options).map(([group, optIds]) => (
                        <View key={group} style={styles.section}>
                            <Text style={styles.sectionTitle}>{group}</Text>
                            <View style={styles.optionsGrid}>
                                {optIds.map((id) => {
                                    const optNode = nodes.find(n => n.id === id);
                                    return (
                                        <View key={id} style={styles.optionChip}>
                                            <Text style={styles.optionText}>{optNode?.title || id}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.addToCartButton}>
                    <Text style={styles.addToCartText}>Add to Cart</Text>
                </TouchableOpacity>
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
        backgroundColor: '#F9F9FB',
    },
    optionText: {
        fontSize: 14,
        color: Colors.text,
        fontWeight: '500',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: Colors.separator,
    },
    addToCartButton: {
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
