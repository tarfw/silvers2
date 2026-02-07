import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const ADMIN_MENU_GROUPS = [
    {
        title: 'Commerce',
        items: [
            { id: 'orders', title: 'Orders', iconName: 'receipt-outline' as const, screen: 'Orders' },
            { id: 'reports', title: 'Sales Reports', iconName: 'bar-chart-outline' as const, screen: 'Reports' },
        ]
    },
    {
        title: 'Catalog',
        items: [
            { id: 'all', title: 'Catalogue', iconName: 'grid-outline' as const, screen: 'Nodes' },
        ]
    },
    {
        title: 'System',
        items: [
            { id: 'profile', title: 'Profile', iconName: 'person-outline' as const, screen: 'Profile' },
        ]
    }
];

const USER_MENU_GROUPS = [
    {
        title: 'My Activities',
        items: [
            { id: 'myorders', title: 'My Orders', iconName: 'receipt-outline' as const, screen: 'MyOrders' },
        ]
    },
    {
        title: 'Account',
        items: [
            { id: 'profile', title: 'Profile', iconName: 'person-outline' as const, screen: 'Profile' },
            { id: 'addresses', title: 'Addresses', iconName: 'location-outline' as const, screen: 'Addresses' },
        ]
    },
];

export function MenuScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { isAdmin } = useAuth();

    const menuGroups = isAdmin ? ADMIN_MENU_GROUPS : USER_MENU_GROUPS;

    const handlePress = (screen: string) => {
        if (['Nodes', 'Orders', 'Reports', 'Inventory', 'Profile', 'MyOrders', 'Addresses'].includes(screen)) {
            navigation.navigate(screen);
        } else if (screen === 'Collections') {
            navigation.navigate('MainTabs', { screen });
        }
    };

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <View className="flex-1">
                {/* Header Area */}
                <View className="px-6 pt-4 pb-4 mb-2">
                    <Text className="text-4xl font-bold text-black tracking-tighter">Menu</Text>
                </View>

                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 24 }}
                    showsVerticalScrollIndicator={false}
                >
                    {menuGroups.map((group) => (
                        <View key={group.title} className="mt-8">
                            <Text className="text-[11px] font-bold text-brand-secondary uppercase tracking-[2px] mb-4 ml-1">
                                {group.title}
                            </Text>
                            <View className="bg-silver-50 rounded-3xl overflow-hidden border border-silver-100">
                                {group.items.map((item, idx) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        onPress={() => handlePress(item.screen)}
                                        className={`flex-row items-center p-4 active:bg-silver-100 ${idx !== group.items.length - 1 ? 'border-b border-white' : ''
                                            }`}
                                    >
                                        <View className="w-10 h-10 rounded-xl bg-white items-center justify-center shadow-sm border border-silver-50">
                                            <Ionicons name={item.iconName} size={20} color="#000" />
                                        </View>
                                        <Text className="flex-1 ml-4 text-[16px] font-semibold text-black">
                                            {item.title}
                                        </Text>
                                        <Ionicons name="chevron-forward" size={16} color="#AEAEB2" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = {
    // legacy styles removed
};
