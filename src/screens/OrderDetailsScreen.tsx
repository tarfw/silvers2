import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { SecureImage } from '../components/SecureImage';
import { generateShortId } from '../lib/utils';

const Colors = {
    background: '#FFFFFF',
    text: '#000000',
    textSecondary: '#636366',
    primary: '#000000',
    separator: '#F2F2F7',
    surface: '#F9F9FB',
    success: '#34C759',
    accent: '#007AFF',
    warning: '#FF9500',
    danger: '#FF3B30',
};

const STATUS_MAP: Record<number, { label: string; color: string; icon: string }> = {
    501: { label: 'Placed', color: Colors.textSecondary, icon: 'receipt-outline' },
    502: { label: 'Paid', color: Colors.accent, icon: 'cash-outline' },
    503: { label: 'Shipped', color: Colors.warning, icon: 'airplane-outline' },
    504: { label: 'Delivered', color: Colors.success, icon: 'checkmark-circle-outline' },
    505: { label: 'Cancelled', color: Colors.danger, icon: 'close-circle-outline' },
};

export function OrderDetailsScreen() {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { streamId } = route.params;
    const { db, user } = useAuth();

    const [items, setItems] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentStatus, setCurrentStatus] = useState(501);

    const loadOrderDetails = useCallback(async () => {
        if (!db || !user) return;
        setIsLoading(true);

        try {
            // 1. Load all events for this order stream
            const allEvents = await db.all(
                'SELECT * FROM orevents WHERE streamid = ? ORDER BY ts DESC',
                [streamId]
            ) as any[];

            // 2. Separate Items (501) from Status Updates (502-505)
            const orderItems = allEvents.filter(e => e.opcode === 501);
            const statusEvents = allEvents.filter(e => e.opcode >= 502 && e.opcode <= 505);

            // 3. Determine latest status
            const latestStatus = allEvents.find(e => e.opcode >= 501 && e.opcode <= 505);

            setItems(orderItems);
            setEvents(allEvents);
            setCurrentStatus(latestStatus?.opcode || 501);
        } catch (error) {
            console.error('Error loading order details:', error);
        } finally {
            setIsLoading(false);
        }
    }, [db, user, streamId]);

    useFocusEffect(
        useCallback(() => {
            loadOrderDetails();
        }, [loadOrderDetails])
    );

    const updateStatus = async (opcode: number) => {
        if (!db || !user) return;

        try {
            await db.run(`
                INSERT INTO orevents (id, streamid, opcode, refid, delta, payload, scope, ts)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                generateShortId(),
                streamId,
                opcode,
                user.id,
                0,
                JSON.stringify({ note: `Status updated to ${STATUS_MAP[opcode].label}` }),
                'order',
                new Date().toISOString()
            ]);
            loadOrderDetails();
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const payload = JSON.parse(item.payload);
        const options = payload.options || {};

        return (
            <View style={styles.itemRow}>
                <SecureImage source={{ uri: payload.image }} style={styles.itemImage} />
                <View style={styles.itemTextContainer}>
                    <Text style={styles.itemName}>{payload.name}</Text>
                    <View style={styles.optionsContainer}>
                        {Object.entries(options).map(([key, val]: [string, any]) => (
                            <Text key={key} style={styles.optionText}>{key}: {val}</Text>
                        ))}
                    </View>
                </View>
                <View style={styles.qtyContainer}>
                    <Text style={styles.qtyText}>x{item.delta}</Text>
                </View>
            </View>
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator color={Colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    const orderNum = streamId.split('_')[1] || streamId;
    const statusInfo = STATUS_MAP[currentStatus];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Order #{orderNum}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Status Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Current Status</Text>
                    <View style={[styles.statusCard, { borderColor: statusInfo.color + '40' }]}>
                        <Ionicons name={statusInfo.icon as any} size={24} color={statusInfo.color} />
                        <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
                            {statusInfo.label}
                        </Text>
                    </View>
                </View>

                {/* Items Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Items ({items.length})</Text>
                    <View style={styles.itemsCard}>
                        {items.map((item, index) => (
                            <View key={item.id}>
                                {renderItem({ item })}
                                {index < items.length - 1 && <View style={styles.separator} />}
                            </View>
                        ))}
                    </View>
                </View>

                {/* Process Section (Opcodes Demo) */}
                <View style={[styles.section, { marginBottom: 100 }]}>
                    <Text style={styles.sectionTitle}>Update Process</Text>
                    <View style={styles.actionsGrid}>
                        {[502, 503, 504].map(code => (
                            <TouchableOpacity
                                key={code}
                                style={[
                                    styles.actionButton,
                                    currentStatus === code && styles.activeAction,
                                    { borderColor: STATUS_MAP[code].color + '40' }
                                ]}
                                onPress={() => updateStatus(code)}
                            >
                                <Ionicons
                                    name={STATUS_MAP[code].icon as any}
                                    size={20}
                                    color={currentStatus === code ? '#FFF' : STATUS_MAP[code].color}
                                />
                                <Text style={[
                                    styles.actionText,
                                    currentStatus === code && styles.activeActionText,
                                    { color: currentStatus === code ? '#FFF' : Colors.text }
                                ]}>
                                    {STATUS_MAP[code].label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>
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
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
    },
    backButton: {
        marginRight: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
    },
    statusLabel: {
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 12,
    },
    itemsCard: {
        backgroundColor: Colors.surface,
        borderRadius: 20,
        padding: 16,
    },
    itemRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        alignItems: 'center',
    },
    itemImage: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#FFF',
    },
    itemTextContainer: {
        flex: 1,
        marginLeft: 16,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 4,
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionText: {
        fontSize: 12,
        color: Colors.textSecondary,
        backgroundColor: '#FFF',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    qtyContainer: {
        marginLeft: 16,
        backgroundColor: '#FFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    qtyText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
    separator: {
        height: 1,
        backgroundColor: Colors.separator,
        opacity: 0.5,
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
    },
    activeAction: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    actionText: {
        marginTop: 8,
        fontSize: 12,
        fontWeight: '600',
    },
    activeActionText: {
        color: '#FFF',
    },
});
