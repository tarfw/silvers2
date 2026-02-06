import React from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    Dimensions,
    StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Local asset import for the hero image
import HERO_IMAGE from '../assets/silver-bangles.jpg';

const { width, height } = Dimensions.get('window');

interface WelcomeScreenProps {
    onSignInWithEmail: () => void;
    onContinueWithGoogle: () => void;
}

export function WelcomeScreen({ onSignInWithEmail, onContinueWithGoogle }: WelcomeScreenProps) {
    const insets = useSafeAreaInsets();

    return (
        <View className="flex-1 bg-white">
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

            {/* Hero Image Section - Taking up substantial space for luxury feel */}
            <View className="relative">
                <View
                    style={{ height: height * 0.55 }}
                    className="w-full bg-silver-100 overflow-hidden"
                >
                    <Image
                        source={HERO_IMAGE}
                        className="w-full h-full"
                        resizeMode="cover"
                    />
                    {/* Soft gradient overlay for text readability if needed */}
                    <View className="absolute inset-0 bg-black/5" />
                </View>

                {/* Brand Floating Logo */}
                <View
                    style={{ top: insets.top + 20 }}
                    className="absolute left-0 right-0 items-center"
                >
                    <View className="px-6 py-2 bg-white/90 rounded-full border border-silver-200 backdrop-blur-md">
                        <Text className="text-black text-xs font-bold tracking-[0.5em] uppercase">
                            Silvers
                        </Text>
                    </View>
                </View>
            </View>

            {/* Content Section */}
            <View
                className="flex-1 px-8 pt-10 pb-12 justify-between"
                style={{ backgroundColor: '#FFFFFF' }}
            >
                <View>
                    <View className="w-12 h-1 bg-black mb-6 rounded-full" />
                    <Text className="text-5xl font-bold text-black tracking-tighter leading-[54px]">
                        Elegance{"\n"}Defined.
                    </Text>
                    <Text className="text-brand-secondary text-[16px] font-medium mt-6 leading-6">
                        Explore our exclusive catalogues of fine rings, bangles, and customized silver jewelry.
                    </Text>
                </View>

                {/* Action Buttons */}
                <View className="gap-y-4">
                    <TouchableOpacity
                        onPress={onSignInWithEmail}
                        activeOpacity={0.9}
                        className="w-full h-16 bg-black rounded-2xl flex-row items-center justify-center border border-black"
                    >
                        <Text className="text-white text-[15px] font-bold uppercase tracking-[2px]">Enter Store</Text>
                        <Ionicons name="arrow-forward" size={18} color="white" style={{ marginLeft: 10 }} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={onContinueWithGoogle}
                        activeOpacity={0.7}
                        className="w-full h-16 bg-silver-50 border border-silver-100 rounded-2xl flex-row items-center justify-center"
                    >
                        <Ionicons name="logo-google" size={18} color="#000" />
                        <Text className="text-black text-[14px] font-bold ml-3 uppercase tracking-wider">Continue with Google</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}
