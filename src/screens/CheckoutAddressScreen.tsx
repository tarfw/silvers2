import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { generateShortId } from '../lib/utils';

const Colors = {
    background: '#FFFFFF',
    text: '#000000',
    textSecondary: '#636366',
    primary: '#000000',
    separator: '#F2F2F7',
    surface: '#F9F9FB',
};

export function CheckoutAddressScreen() {
    const { user, db } = useAuth();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { cartItems } = route.params;

    const [addressHistory, setAddressHistory] = useState<any[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [newAddress, setNewAddress] = useState('');
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [setAsDefault, setSetAsDefault] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            if (!db || !user) return;
            try {
                const actorData = await db.all('SELECT metadata FROM actors WHERE id = ?', [user.id]) as any[];
                if (actorData?.[0]?.metadata) {
                    const metadata = JSON.parse(actorData[0].metadata);
                    const addresses = metadata.addresses || [];
                    setAddressHistory(addresses);

                    const defaultAddr = addresses.find((a: any) => a.isDefault);
                    if (defaultAddr) {
                        setSelectedAddressId(defaultAddr.id);
                    } else if (addresses.length > 0) {
                        setSelectedAddressId(addresses[0].id);
                    } else {
                        setIsAddingNew(true);
                    }
                } else {
                    setIsAddingNew(true);
                }
            } catch (error) {
                console.error('Error loading address history:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadHistory();
    }, [db, user]);

    const handlePlaceOrder = async () => {
        if (!db || !user || isProcessing) return;

        const finalAddressText = isAddingNew ? newAddress.trim() : addressHistory.find(a => a.id === selectedAddressId)?.text;

        if (!finalAddressText) {
            Alert.alert('Error', 'Please provide a shipping address');
            return;
        }

        setIsProcessing(true);

        try {
            const orderId = `order_${generateShortId()}`;
            const timestamp = new Date().toISOString();

            // 1. Create the persistent Order Stream
            await db.run(`
                INSERT INTO streams (id, scope, createdby, createdat)
                VALUES (?, ?, ?, ?)
            `, [orderId, 'order', user.id, timestamp]);

            // 2. Add user as participant (streamcollab)
            await db.run(`
                INSERT INTO streamcollab (streamid, actorid, role, joinedat)
                VALUES (?, ?, ?, ?)
            `, [orderId, user.id, 'owner', timestamp]);

            // 3. Move each cart item as an Atomic Event (Opcode 501)
            for (const item of cartItems) {
                const eventId = generateShortId();
                await db.run(`
                    INSERT INTO orevents (id, streamid, opcode, refid, delta, payload, scope, ts)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    eventId,
                    orderId,
                    501,
                    user.id,
                    item.delta,
                    item.payload,
                    'order',
                    timestamp
                ]);
            }

            // 4. Save Shipping Address Snapshot (Opcode 506)
            await db.run(`
                INSERT INTO orevents (id, streamid, opcode, refid, delta, payload, scope, ts)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                generateShortId(),
                orderId,
                506,
                user.id,
                0,
                JSON.stringify({ address: finalAddressText }),
                'order',
                timestamp
            ]);

            // 5. Update Address History in Metadata
            let updatedHistory = [...addressHistory];
            const normalizedNew = finalAddressText.toLowerCase().trim();
            const existingIdx = updatedHistory.findIndex(a => a.text.toLowerCase().trim() === normalizedNew);

            if (existingIdx >= 0) {
                updatedHistory[existingIdx] = { ...updatedHistory[existingIdx], lastUsed: timestamp };
                if (setAsDefault) {
                    updatedHistory = updatedHistory.map((a, i) => ({ ...a, isDefault: i === existingIdx }));
                }
            } else {
                const newAddrObj = {
                    id: `addr_${generateShortId()}`,
                    text: finalAddressText,
                    isDefault: setAsDefault || updatedHistory.length === 0,
                    lastUsed: timestamp
                };
                if (newAddrObj.isDefault) {
                    updatedHistory = updatedHistory.map(a => ({ ...a, isDefault: false }));
                }
                updatedHistory.unshift(newAddrObj);
            }

            await db.run('UPDATE actors SET metadata = ? WHERE id = ?', [
                JSON.stringify({ addresses: updatedHistory }),
                user.id
            ]);

            // 6. Clear current cart
            await db.run('DELETE FROM orevents WHERE opcode = ? AND refid = ?', [401, user.id]);

            // Navigate directly to OrderDetails with a success flag
            // Use replace to prevent going back to the shipping screen
            navigation.replace('OrderDetails', {
                streamId: orderId,
                justPlaced: true
            });
        } catch (error) {
            console.error('Order error:', error);
            Alert.alert('Error', 'Failed to place order');
        } finally {
            setIsProcessing(false);
        }
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

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Shipping</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>Where should we send your order?</Text>

                {addressHistory.length > 0 && !isAddingNew ? (
                    <View style={styles.addressList}>
                        {addressHistory.map((addr) => (
                            <TouchableOpacity
                                key={addr.id}
                                style={[styles.addressItem, selectedAddressId === addr.id && styles.selectedAddress]}
                                onPress={() => setSelectedAddressId(addr.id)}
                            >
                                <Ionicons
                                    name={selectedAddressId === addr.id ? "radio-button-on" : "radio-button-off"}
                                    size={20}
                                    color={selectedAddressId === addr.id ? Colors.primary : Colors.textSecondary}
                                />
                                <View style={styles.addressContent}>
                                    <Text style={styles.addressText}>{addr.text}</Text>
                                    {addr.isDefault && <Text style={styles.defaultLabel}>Default</Text>}
                                </View>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={styles.addNewButton}
                            onPress={() => setIsAddingNew(true)}
                        >
                            <Ionicons name="add" size={20} color={Colors.primary} />
                            <Text style={styles.addNewText}>Use a different address</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.newAddressContainer}>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="location-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                value={newAddress}
                                onChangeText={setNewAddress}
                                placeholder="Enter full shipping address..."
                                style={styles.addressInput}
                                multiline
                                autoFocus
                                placeholderTextColor={Colors.textSecondary}
                            />
                        </View>
                        <TouchableOpacity
                            style={styles.defaultCheckbox}
                            onPress={() => setSetAsDefault(!setAsDefault)}
                        >
                            <Ionicons
                                name={setAsDefault ? "checkbox" : "square-outline"}
                                size={20}
                                color={setAsDefault ? Colors.primary : Colors.textSecondary}
                            />
                            <Text style={styles.checkboxLabel}>Set as default address</Text>
                        </TouchableOpacity>
                        {addressHistory.length > 0 && (
                            <TouchableOpacity
                                onPress={() => setIsAddingNew(false)}
                                style={styles.cancelNewButton}
                            >
                                <Text style={styles.cancelNewText}>Choose from saved addresses</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.placeOrderButton, isProcessing && styles.disabledButton]}
                    onPress={handlePlaceOrder}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.placeOrderText}>Confirm & Place Order</Text>
                    )}
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
        paddingBottom: 100,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 24,
        marginTop: 8,
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
        marginTop: 8,
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
        padding: 16,
        alignItems: 'flex-start',
    },
    inputIcon: {
        marginTop: 2,
    },
    addressInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: Colors.text,
        minHeight: 120,
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
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: Colors.separator,
        backgroundColor: Colors.background,
    },
    placeOrderButton: {
        backgroundColor: Colors.primary,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledButton: {
        opacity: 0.6,
    },
    placeOrderText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
});
