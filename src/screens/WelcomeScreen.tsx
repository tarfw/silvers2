import React from 'react';
import {
    View,
    Text,
    SafeAreaView,
    Image,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// Local asset import for the hero image
import HERO_IMAGE from '../assets/silver-bangles.jpg';

const { width } = Dimensions.get('window');

// Brighter, vibrant sapphire blue from the jewelry imagery
const JEWEL_BLUE_BG = '#004c8c';

interface WelcomeScreenProps {
    onSignInWithEmail: () => void;
    onContinueWithGoogle: () => void;
}

export function WelcomeScreen({ onSignInWithEmail, onContinueWithGoogle }: WelcomeScreenProps) {
    return (
        <View className="flex-1" style={{ backgroundColor: JEWEL_BLUE_BG }}>
            <StatusBar style="light" />
            <SafeAreaView className="flex-1">
                <View className="flex-1 px-6 pb-24">

                    {/* Brand Name Area - Increased top spacing back to 20 for logo breathing room */}
                    <View className="mt-20 mb-10 items-center justify-center">
                        <Text className="text-white text-6xl font-serif tracking-[0.05em] font-extrabold text-center">
                            SKJ
                        </Text>
                        <Text className="text-white/60 text-sm font-sans tracking-[0.8em] uppercase text-center mt-3 font-semibold">
                            SILVERS
                        </Text>
                    </View>

                    {/* Top Image Card - Editorial focus with local image */}
                    <View className="w-full h-[38%] rounded-[40px] overflow-hidden bg-white/10 border border-white/20 shadow-2xl">
                        <Image
                            source={HERO_IMAGE}
                            className="w-full h-full"
                            resizeMode="cover"
                        />
                    </View>

                    {/* Welcome Text */}
                    <View className="mt-10 mb-8">
                        <Text className="text-3xl text-white font-serif tracking-tight leading-[42px] font-semibold">
                            Elegance in Detail.{"\n"}
                            Wear the Silver.
                        </Text>

                        <Text className="text-white/70 text-base mt-4 font-light leading-6">
                            Explore our exclusive catalogues of fine rings, bangles, and customized silver jewelry.
                        </Text>
                    </View>

                    {/* Action Buttons */}
                    <View className="mt-auto">
                        <TouchableOpacity
                            onPress={onSignInWithEmail}
                            activeOpacity={0.8}
                            className="w-full h-16 bg-white rounded-full flex-row items-center justify-between px-8 shadow-lg shadow-black/20"
                        >
                            <Text className="text-black text-lg font-bold">Continue with Email</Text>
                            <Ionicons name="arrow-forward" size={24} color="#E11D48" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onContinueWithGoogle}
                            activeOpacity={0.7}
                            className="w-full h-16 bg-white/10 border border-white/20 rounded-full flex-row items-center justify-center px-8 mt-8"
                        >
                            <View className="mr-4">
                                <Ionicons name="logo-google" size={22} color="white" />
                            </View>
                            <Text className="text-white text-base font-bold">Sign in with Google</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </SafeAreaView>
        </View>
    );
}
