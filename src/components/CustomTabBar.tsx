import React from 'react';
import { View, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
    withTiming,
    interpolateColor
} from 'react-native-reanimated';
import { cssInterop } from 'nativewind';

const StyledBlurView = cssInterop(BlurView, { className: "style" });
const { width } = Dimensions.get('window');

const TAB_BAR_WIDTH = width - 48; // 24 padding on each side
const TAB_WIDTH = TAB_BAR_WIDTH / 4;

export function CustomTabBar({ state, descriptors, navigation }: any) {
    const translateX = useSharedValue(state.index * TAB_WIDTH);

    React.useEffect(() => {
        translateX.value = withSpring(state.index * TAB_WIDTH, {
            damping: 15,
            stiffness: 100,
        });
    }, [state.index]);

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    return (
        <View className="absolute bottom-10 left-6 right-6 h-20" pointerEvents="box-none">
            <BlurView
                intensity={95}
                tint="extraLight"
                className="absolute inset-0 rounded-[40px] bg-white/40 overflow-hidden border border-white/40 shadow-2xl shadow-black/20"
            >
                <View className="flex-1 flex-row relative items-center justify-center">
                    {/* Animated Indicator Background */}
                    <Animated.View
                        style={[
                            indicatorStyle,
                            {
                                width: TAB_WIDTH - 12,
                                height: 56,
                                backgroundColor: '#000',
                                position: 'absolute',
                                left: 6,
                                borderRadius: 28,
                            }
                        ]}
                    />

                    {state.routes.map((route: any, index: number) => {
                        const { options } = descriptors[route.key];
                        const isFocused = state.index === index;

                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });

                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        };

                        const onLongPress = () => {
                            navigation.emit({
                                type: 'tabLongPress',
                                target: route.key,
                            });
                        };

                        const getIcon = (name: string, focused: boolean) => {
                            switch (name) {
                                case 'Home': return focused ? 'storefront' : 'storefront-outline';
                                case 'Collections': return focused ? 'search' : 'search-outline';
                                case 'Cart': return focused ? 'cart' : 'cart-outline';
                                case 'Menu': return focused ? 'grid' : 'grid-outline';
                                default: return 'square';
                            }
                        };

                        return (
                            <TouchableOpacity
                                key={index}
                                accessibilityRole="button"
                                accessibilityState={isFocused ? { selected: true } : {}}
                                accessibilityLabel={options.tabBarAccessibilityLabel}
                                testID={options.tabBarTestID}
                                onPress={onPress}
                                onLongPress={onLongPress}
                                className="flex-1 items-center justify-center h-full"
                                activeOpacity={0.7}
                                style={{ pointerEvents: 'auto' }}
                            >
                                <Ionicons
                                    name={getIcon(route.name, isFocused) as any}
                                    size={24}
                                    color={isFocused ? '#FFF' : '#8E8E93'}
                                />
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </BlurView>
        </View>
    );
}
