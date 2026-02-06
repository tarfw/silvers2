import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export function ProfileScreen() {
    const { signOut, user } = useAuth();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    const initials = user?.email?.charAt(0).toUpperCase() || 'U';

    return (
        <View className="flex-1 bg-white">
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100, paddingTop: insets.top }}
            >
                {/* Profile Card */}
                <View className="px-6 py-10 items-center border-b border-silver-50">
                    <View className="w-24 h-24 rounded-full bg-black items-center justify-center border-2 border-silver-100">
                        <Text className="text-4xl font-bold text-white">{initials}</Text>
                    </View>
                    <Text className="text-2xl font-bold text-black mt-6 tracking-tight">
                        {user?.email?.split('@')[0]}
                    </Text>
                </View>

                {/* Account Details Section */}
                <View className="px-6 py-8">
                    <Text className="text-[11px] font-bold text-brand-secondary uppercase tracking-[2px] mb-4 ml-1">Account</Text>
                    <View className="bg-silver-50/50 rounded-2xl border border-silver-100 overflow-hidden">
                        <View className="px-5 py-4 flex-row items-center bg-white">
                            <Ionicons name="mail-outline" size={20} color="#AEAEB2" />
                            <View className="ml-4">
                                <Text className="text-[10px] font-bold text-brand-secondary uppercase tracking-wider">Email Address</Text>
                                <Text className="text-base font-semibold text-black">{user?.email}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Preferences Section */}
                <View className="px-6 pb-8">
                    <Text className="text-[11px] font-bold text-brand-secondary uppercase tracking-[2px] mb-4 ml-1">Support</Text>
                    <View className="bg-silver-50/50 rounded-2xl border border-silver-100 overflow-hidden">
                        <TouchableOpacity className="px-5 py-4 flex-row items-center justify-between border-b border-silver-100 bg-white shadow-sm">
                            <View className="flex-row items-center">
                                <Ionicons name="help-circle-outline" size={20} color="#AEAEB2" />
                                <Text className="text-base font-semibold text-black ml-4">Help Center</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#D1D1D6" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Sign Out Section */}
                <View className="px-6 mt-4">
                    <TouchableOpacity
                        className="flex-row items-center justify-center h-14 bg-red-50 rounded-2xl border border-red-100 active:bg-red-100"
                        onPress={signOut}
                    >
                        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                        <Text className="text-base font-bold text-red-500 ml-2 uppercase tracking-widest">Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}
