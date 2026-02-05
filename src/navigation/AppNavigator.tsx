import React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProductsScreen } from '../screens/ProductsScreen';
import { CollectionsScreen } from '../screens/CollectionsScreen';
import { CartScreen } from '../screens/CartScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { MenuScreen } from '../screens/MenuScreen';
import { NodesScreen } from '../screens/NodesScreen';
import { ProductDetailsScreen } from '../screens/ProductDetailsScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { InventoryScreen } from '../screens/InventoryScreen';
import { OrderDetailsScreen } from '../screens/OrderDetailsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { CheckoutAddressScreen } from '../screens/CheckoutAddressScreen';


import { Ionicons } from '@expo/vector-icons';

import { Platform, StyleSheet } from 'react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

import { BlurView } from 'expo-blur';
import { cssInterop } from 'nativewind';

cssInterop(BlurView, { className: "style" });

import { CustomTabBar } from '../components/CustomTabBar';

function TabNavigator() {
    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tab.Screen name="Home" component={ProductsScreen} />
            <Tab.Screen name="Collections" component={CollectionsScreen} />
            <Tab.Screen name="Cart" component={CartScreen} />
            <Tab.Screen name="Menu" component={MenuScreen} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    // Simplified styles, iconWrapper removed to allow natural centering
});

export function AppNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen
                name="Nodes"
                component={NodesScreen}
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="ProductDetails"
                component={ProductDetailsScreen}
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen name="Orders" component={OrdersScreen} />
            <Stack.Screen name="Reports" component={ReportsScreen} />
            <Stack.Screen name="Inventory" component={InventoryScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
            <Stack.Screen name="CheckoutAddress" component={CheckoutAddressScreen} />
            <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    headerShown: true,
                    headerTitle: 'Profile',
                    headerBackTitle: 'Back',
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#FFFFFF' },
                }}
            />

        </Stack.Navigator>
    );
}
