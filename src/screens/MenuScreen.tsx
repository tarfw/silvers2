import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useNodes } from '../hooks/useNodes';
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
    const { isSyncing, pull, push, sync } = useNodes();
    const [isPulling, setIsPulling] = useState(false);
    const [isPushing, setIsPushing] = useState(false);

    const menuGroups = isAdmin ? ADMIN_MENU_GROUPS : USER_MENU_GROUPS;

    const handlePress = (screen: string) => {
        if (['Nodes', 'Orders', 'Reports', 'Inventory', 'Profile', 'MyOrders', 'Addresses'].includes(screen)) {
            navigation.navigate(screen);
        } else if (screen === 'Collections') {
            navigation.navigate('MainTabs', { screen });
        }
    };

    const handlePull = async () => {
        setIsPulling(true);
        try {
            await pull();
        } catch (e) {
            Alert.alert('Pull Failed', 'Could not fetch updates from cloud.');
        } finally {
            setTimeout(() => setIsPulling(false), 500);
        }
    };

    const handlePush = async () => {
        setIsPushing(true);
        try {
            await push();
        } catch (e: any) {
            if (e.message?.includes('FOREIGN KEY')) {
                Alert.alert('Push Failed', 'A dependency issue occurred. Try Pulling first.');
            } else {
                Alert.alert('Push Failed', 'Could not upload updates to cloud.');
            }
        } finally {
            setTimeout(() => setIsPushing(false), 500);
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
                    contentContainerStyle={{ paddingBottom: 180, paddingHorizontal: 24 }}
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

            {/* Bottom Floating Sync Bar - Unified for Reliability */}
            <View className="absolute bottom-32 left-6 right-6">
                <TouchableOpacity
                    onPress={async () => {
                        try {
                            await sync();
                        } catch (e) {
                            Alert.alert('Sync Failed', 'Could not synchronize with cloud. Check your connection.');
                        }
                    }}
                    disabled={isSyncing}
                    activeOpacity={0.8}
                    className="bg-black rounded-full h-16 flex-row items-center px-6 shadow-2xl justify-between"
                >
                    <View className="flex-row items-center">
                        <Ionicons
                            name={isSyncing ? "refresh" : "cloud-done-outline"}
                            size={20}
                            color="#FFF"
                        />
                        <Text className="text-white font-bold ml-3 text-sm uppercase tracking-widest">
                            {isSyncing ? 'Synchronizing...' : 'Sync Everything'}
                        </Text>
                    </View>
                    <View className="bg-white/10 px-4 py-2 rounded-full">
                        <Text className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                            {isSyncing ? 'In Progress' : 'Cloud Safe'}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
}
