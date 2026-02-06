import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { cssInterop } from 'nativewind';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

cssInterop(AnimatedTouchableOpacity, { className: "style" });

interface ButtonProps {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    disabled?: boolean;
    className?: string;
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    label,
    onPress,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled = false,
    className = '',
    icon,
}) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.96);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1);
    };

    const getVariantClass = () => {
        switch (variant) {
            case 'primary': return '';
            case 'secondary': return 'bg-silver-100';
            case 'outline': return 'bg-transparent border border-silver-200';
            case 'ghost': return 'bg-transparent';
            default: return '';
        }
    };

    const getTextClass = () => {
        switch (variant) {
            case 'primary': return 'text-white';
            case 'secondary': return 'text-brand-primary';
            case 'outline': return 'text-brand-primary';
            case 'ghost': return 'text-brand-primary';
            default: return 'text-white';
        }
    };

    const getSizeClass = () => {
        switch (size) {
            case 'sm': return 'h-10 px-4 rounded-xl';
            case 'md': return 'h-12 px-6 rounded-2xl';
            case 'lg': return 'h-14 px-8 rounded-3xl';
            default: return 'h-12 px-6 rounded-2xl';
        }
    };

    return (
        <AnimatedTouchableOpacity
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || isLoading}
            activeOpacity={0.8}
            style={animatedStyle}
        >
            <View
                style={variant === 'primary' || !['secondary', 'outline', 'ghost'].includes(variant) ? { backgroundColor: '#004c8c' } : {}}
                className={`flex-row items-center justify-center ${getVariantClass()} ${getSizeClass()} ${className} ${disabled ? 'opacity-50' : ''}`}
            >
                {isLoading ? (
                    <ActivityIndicator color={variant === 'primary' ? 'white' : '#000'} />
                ) : (
                    <>
                        {icon && <View className="mr-2">{icon}</View>}
                        <Text className={`font-semibold ${getTextClass()}`}>{label}</Text>
                    </>
                )}
            </View>
        </AnimatedTouchableOpacity>
    );
};
