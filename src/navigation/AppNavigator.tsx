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

function TabNavigator() {
    return (
        <Tab.Navigator
            safeAreaInsets={{ bottom: 0, top: 0, left: 0, right: 0 }}
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarActiveTintColor: '#000000',
                tabBarInactiveTintColor: '#A1A1AA',
                tabBarLabelPosition: 'beside-icon',
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 32,
                    left: 32,
                    right: 32,
                    backgroundColor: '#F2F2F7',
                    borderRadius: 36,
                    height: 72,
                    borderTopWidth: 0,
                    borderWidth: 0,
                    elevation: 0,
                    shadowOpacity: 0,
                    paddingTop: 0,
                    paddingBottom: 0,
                },
                tabBarItemStyle: {
                    height: 72,
                    justifyContent: 'center',
                    alignItems: 'center',
                },
                tabBarIconStyle: {
                    marginTop: 0,
                    marginBottom: 0,
                },
            }}
        >
            <Tab.Screen
                name="Home"
                component={ProductsScreen}
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "home" : "home-outline"} size={26} color={color} />
                    )
                }}
            />
            <Tab.Screen
                name="Collections"
                component={CollectionsScreen}
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "search" : "search-outline"} size={26} color={color} />
                    )
                }}
            />
            <Tab.Screen
                name="Cart"
                component={CartScreen}
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "cart" : "cart-outline"} size={26} color={color} />
                    )
                }}
            />
            <Tab.Screen
                name="Menu"
                component={MenuScreen}
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "menu" : "menu-outline"} size={28} color={color} />
                    )
                }}
            />
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
                    headerShown: true,
                    headerTitle: 'All Items',
                    headerBackTitle: 'Back',
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#FFFFFF' },
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
