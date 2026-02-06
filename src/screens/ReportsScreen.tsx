import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

const Colors = {
    background: '#FFFFFF',
    text: '#000000',
    textSecondary: '#636366',
    primary: '#000000',
    separator: '#F2F2F7',
    surface: '#F9F9FB',
    accent: '#007AFF',
};

interface ReportStats {
    totalSales: number;
    totalUnits: number;
    orderCount: number;
    topProducts: { name: string; qty: number }[];
}

export function ReportsScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { db, user } = useAuth();
    const [stats, setStats] = useState<ReportStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadStats = useCallback(async () => {
        if (!db || !user) return;
        setIsLoading(true);

        try {
            // 1. Total Units and Sales (counting events with opcode 501)
            const basicStats = await db.all(`
                SELECT SUM(delta) as totalUnits, COUNT(DISTINCT streamid) as orderCount
                FROM orevents 
                WHERE opcode = 501
            `) as any[];

            // 2. Aggregate top products by parsing payload
            const itemEvents = await db.all(`
                SELECT payload, delta 
                FROM orevents 
                WHERE opcode = 501
            `) as any[];

            const productMap = new Map<string, number>();
            itemEvents.forEach(event => {
                try {
                    const data = JSON.parse(event.payload);
                    const name = data.name || 'Unknown Product';
                    productMap.set(name, (productMap.get(name) || 0) + event.delta);
                } catch (e) { }
            });

            const topProducts = Array.from(productMap.entries())
                .map(([name, qty]) => ({ name, qty }))
                .sort((a, b) => b.qty - a.qty)
                .slice(0, 5);

            setStats({
                totalSales: basicStats[0]?.totalUnits * 45, // Placeholder price multiplier for demo
                totalUnits: basicStats[0]?.totalUnits || 0,
                orderCount: basicStats[0]?.orderCount || 0,
                topProducts
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setIsLoading(false);
        }
    }, [db, user]);

    useFocusEffect(
        useCallback(() => {
            loadStats();
        }, [loadStats])
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { letterSpacing: -1 }]}>Sales Reports</Text>
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={Colors.primary} />
                </View>
            ) : !stats || stats.orderCount === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="bar-chart-outline" size={64} color="#D1D1D6" />
                    <Text style={styles.emptyTitle}>No data yet</Text>
                    <Text style={styles.emptySubtitle}>Analytics will appear here once orders are placed</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>Order Count</Text>
                            <Text style={styles.statValue}>{stats.orderCount}</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>Units Sold</Text>
                            <Text style={styles.statValue}>{stats.totalUnits}</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Top Selling Products</Text>
                    <View style={styles.productCard}>
                        {stats.topProducts.map((p, i) => (
                            <View key={p.name} style={[
                                styles.productRow,
                                i === stats.topProducts.length - 1 && styles.noBorder
                            ]}>
                                <Text style={styles.productName}>{p.name}</Text>
                                <Text style={styles.productQty}>{p.qty} sold</Text>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            )}
        </View>
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
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    emptyTitle: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
    },
    emptySubtitle: {
        marginTop: 8,
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 32,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.text,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 16,
    },
    productCard: {
        backgroundColor: Colors.surface,
        borderRadius: 20,
        paddingHorizontal: 20,
    },
    productRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.separator,
    },
    noBorder: {
        borderBottomWidth: 0,
    },
    productName: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.text,
    },
    productQty: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.accent,
    },
});
