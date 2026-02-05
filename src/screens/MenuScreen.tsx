import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const Colors = {
    background: '#FFFFFF',
    text: '#000000',
    textSecondary: '#636366',
    separator: '#F2F2F7',
    surface: '#F9F9FB',
};

const MENU_GROUPS = [
    {
        title: 'Commerce',
        items: [
            { id: 'orders', title: 'Orders', iconName: 'receipt-outline' as const, screen: 'Orders' },
            { id: 'reports', title: 'Sales Reports', iconName: 'bar-chart-outline' as const, screen: 'Reports' },
            { id: 'inventory', title: 'Inventory', iconName: 'cube-outline' as const, screen: 'Inventory' },
        ]
    },
    {
        title: 'Catalog',
        items: [
            { id: 'all', title: 'All Products', iconName: 'grid-outline' as const, screen: 'Nodes' },
            { id: 'collections', title: 'Collections', iconName: 'albums-outline' as const, screen: 'Collections' },
        ]
    },
    {
        title: 'System',
        items: [
            { id: 'profile', title: 'Profile', iconName: 'person-outline' as const, screen: 'Profile' },
            { id: 'settings', title: 'Settings', iconName: 'settings-outline' as const, screen: 'Settings' },
        ]
    }
];

export function MenuScreen() {
    const navigation = useNavigation<any>();

    const handlePress = (screen: string) => {
        if (screen === 'Nodes' || screen === 'Orders' || screen === 'Reports' || screen === 'Inventory') {
            navigation.navigate(screen);
        } else if (screen === 'Profile' || screen === 'Collections') {
            // These are in MainTabs, use nested navigation
            navigation.navigate('MainTabs', { screen });
        } else {
            console.log('Navigate to:', screen);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Menu</Text>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {MENU_GROUPS.map((group, groupIdx) => (
                    <View key={group.title} style={styles.group}>
                        <Text style={styles.groupTitle}>{group.title}</Text>
                        <View style={styles.groupContent}>
                            {group.items.map((item, itemIdx) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.menuItem,
                                        itemIdx === group.items.length - 1 && styles.noBorder
                                    ]}
                                    onPress={() => handlePress(item.screen)}
                                >
                                    <View style={styles.itemIcon}>
                                        <Ionicons name={item.iconName} size={20} color="#000" />
                                    </View>
                                    <Text style={styles.itemTitle}>{item.title}</Text>
                                    <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}
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
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 120, // Space for floating tab bar
    },
    group: {
        marginBottom: 32,
        paddingHorizontal: 20,
    },
    groupTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    groupContent: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.separator,
    },
    noBorder: {
        borderBottomWidth: 0,
    },
    itemIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        // Light shadow for icon to pop
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    itemTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: Colors.text,
    },
});

