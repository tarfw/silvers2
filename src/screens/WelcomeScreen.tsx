import React from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    ScrollView,
    StyleSheet
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';

// Local asset import for the hero image
import HERO_IMAGE from '../assets/silver-bangles.jpg';

const { width, height } = Dimensions.get('window');

export function WelcomeScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

    const onSignInWithEmail = () => navigation.navigate('SignIn');
    const onContinueWithGoogle = () => {
        // TODO: Implement Google Sign In
        console.log('Google Sign In');
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

            {/* Hero Image Section - Set to exactly 50% as requested */}
            <View style={{ height: height * 0.50, position: 'relative', backgroundColor: '#000', overflow: 'hidden' }}>
                <Image
                    source={HERO_IMAGE}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                />
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.22)' }} />

                {/* Main Branding - SKJ SILVERS */}
                <View
                    style={{
                        position: 'absolute',
                        top: insets.top + 30,
                        left: 0,
                        right: 0,
                        paddingHorizontal: 40
                    }}
                >
                    <View>
                        <Text
                            style={{
                                color: '#FFFFFF',
                                fontSize: 60,
                                fontWeight: '900',
                                lineHeight: 60,
                                letterSpacing: -2.5
                            }}
                        >
                            SKJ
                        </Text>
                        <Text
                            style={{
                                color: '#FFFFFF',
                                fontSize: 13,
                                fontWeight: '700',
                                letterSpacing: 8,
                                textTransform: 'uppercase',
                                opacity: 0.9,
                                marginTop: -2
                            }}
                        >
                            SILVERS
                        </Text>
                    </View>
                    <View style={{ width: 30, height: 3, backgroundColor: '#FFFFFF', marginTop: 14, borderRadius: 10 }} />
                </View>
            </View>

            {/* Content Section */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                    paddingHorizontal: 32,
                    paddingTop: 40,
                    paddingBottom: 100 // Significant bottom padding
                }}
                bounces={false}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ marginBottom: 40 }}>
                    <Text
                        style={{
                            fontSize: 42,
                            fontWeight: '800',
                            color: '#000000',
                            letterSpacing: -1.5,
                            lineHeight: 46,
                            marginBottom: 8
                        }}
                    >
                        Elegance{"\n"}Defined.
                    </Text>
                    <Text
                        style={{
                            fontSize: 18,
                            fontWeight: '500',
                            color: '#636366',
                            lineHeight: 28,
                            letterSpacing: -0.5,
                            marginTop: 10
                        }}
                    >
                        Explore our exclusive catalogues of fine rings, bangles, and customized silver jewelry.
                    </Text>
                </View>

                {/* Harmonized Button Set: Geometric Sharp Design to match Auth Screen */}
                <View style={{ gap: 16 }}>
                    <TouchableOpacity
                        onPress={onSignInWithEmail}
                        activeOpacity={0.8}
                        style={{
                            height: 60,
                            borderRadius: 100,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: '#E5E5EA', // Very light border for a "no bg" feel
                            marginVertical: 8
                        }}
                    >
                        <Ionicons name="mail" size={18} color="black" />
                        <Text style={{
                            color: '#000000',
                            fontSize: 15,
                            fontWeight: '500',
                            marginLeft: 12,
                            letterSpacing: 1.5,
                            textTransform: 'uppercase'
                        }}>
                            Sign in with email
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={onContinueWithGoogle}
                        activeOpacity={0.7}
                        style={{
                            height: 60,
                            borderRadius: 100,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: '#E5E5EA',
                            marginBottom: 80
                        }}
                    >
                        <Image
                            source={{ uri: 'https://img.icons8.com/color/72/google-logo.png' }}
                            style={{ width: 22, height: 22 }}
                            resizeMode="contain"
                        />
                        <Text style={{
                            color: '#000000',
                            fontSize: 14,
                            fontWeight: '500',
                            marginLeft: 12,
                            letterSpacing: 1,
                            textTransform: 'uppercase'
                        }}>
                            Continue with Google
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}
