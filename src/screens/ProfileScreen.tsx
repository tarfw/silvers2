import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export function ProfileScreen() {
    const { signOut, user } = useAuth();

    const initials = user?.email?.charAt(0).toUpperCase() || 'U';

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-5 pt-4 pb-5">
                <Text className="text-4xl font-bold text-black tracking-tight">Account</Text>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="items-center py-10">
                    <View className="w-24 h-24 rounded-full bg-black items-center justify-center mb-4">
                        <Text className="text-3xl font-bold text-white">{initials}</Text>
                    </View>
                    <Text className="text-xl font-bold text-black">{user?.email}</Text>
                    <Text className="text-sm text-brand-secondary font-medium mt-1">Free Member</Text>
                </View>

                <View className="px-5 mb-8">
                    <Text className="text-[11px] font-bold text-brand-secondary uppercase tracking-[2px] mb-4 ml-1">Settings</Text>
                    <View className="bg-silver-50 rounded-3xl overflow-hidden border border-silver-100">
                        <TouchableOpacity className="flex-row items-center justify-between px-5 py-4 border-b border-silver-100">
                            <View className="flex-row items-center">
                                <Ionicons name="notifications-outline" size={20} color="#000" />
                                <Text className="text-base font-semibold text-black ml-3">Notifications</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#D1D1D6" />
                        </TouchableOpacity>
                        <TouchableOpacity className="flex-row items-center justify-between px-5 py-4 border-b border-silver-100">
                            <View className="flex-row items-center">
                                <Ionicons name="shield-checkmark-outline" size={20} color="#000" />
                                <Text className="text-base font-semibold text-black ml-3">Privacy & Security</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#D1D1D6" />
                        </TouchableOpacity>
                        <TouchableOpacity className="flex-row items-center justify-between px-5 py-4">
                            <View className="flex-row items-center">
                                <Ionicons name="help-circle-outline" size={20} color="#000" />
                                <Text className="text-base font-semibold text-black ml-3">Help Center</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#D1D1D6" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View className="px-5 mb-32">
                    <TouchableOpacity
                        className="flex-row items-center justify-between px-6 py-5 bg-red-50 rounded-3xl border border-red-100"
                        onPress={signOut}
                    >
                        <View className="flex-row items-center">
                            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                            <Text className="text-base font-bold text-red-500 ml-3">Sign Out</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#EF4444" opacity={0.5} />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
