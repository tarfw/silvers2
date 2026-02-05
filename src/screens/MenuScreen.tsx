import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useNodes } from '../hooks/useNodes';
import { Button } from '../components/ui/Button';

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
    const { isSyncing, pull, push } = useNodes();
    const [isPulling, setIsPulling] = useState(false);
    const [isPushing, setIsPushing] = useState(false);

    const handlePress = (screen: string) => {
        if (['Nodes', 'Orders', 'Reports', 'Inventory', 'Profile', 'Settings'].includes(screen)) {
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
        <View className="flex-1 bg-white">
            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="px-6 pt-6 pb-2">
                    <Text className="text-4xl font-bold text-black tracking-tight">Menu</Text>
                </View>

                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 180, paddingHorizontal: 24 }}
                    showsVerticalScrollIndicator={false}
                >
                    {MENU_GROUPS.map((group) => (
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
            </SafeAreaView>

            {/* Bottom Floating Sync Bar */}
            <View className="absolute bottom-32 left-6 right-6">
                <View className="bg-black rounded-full h-16 flex-row items-center px-2 shadow-2xl items-center justify-between">
                    <View className="flex-row flex-1">
                        <TouchableOpacity
                            onPress={handlePull}
                            disabled={isPulling}
                            className="flex-1 items-center justify-center"
                        >
                            <View className="flex-row items-center">
                                <Ionicons name="cloud-download-outline" size={18} color="#FFF" />
                                <Text className="text-white font-bold ml-2 text-sm uppercase tracking-widest">Pull</Text>
                            </View>
                        </TouchableOpacity>

                        <View className="w-[1px] h-6 bg-white/20 self-center" />

                        <TouchableOpacity
                            onPress={handlePush}
                            disabled={isPushing}
                            className="flex-1 items-center justify-center"
                        >
                            <View className="flex-row items-center">
                                <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />
                                <Text className="text-white font-bold ml-2 text-sm uppercase tracking-widest">Push</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View className="bg-white/10 px-4 py-2 rounded-full mr-1">
                        <Text className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                            {isPulling || isPushing || isSyncing ? 'Syncing...' : 'Synced'}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

