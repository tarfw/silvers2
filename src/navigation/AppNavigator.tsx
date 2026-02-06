import React from 'react';
import { StyleSheet } from 'react-native';
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
import { MyOrdersScreen } from '../screens/MyOrdersScreen';
import { ActorsScreen } from '../screens/ActorsScreen';
import { AddressesScreen } from '../screens/AddressesScreen';

import { cssInterop } from 'nativewind';
import { BlurView } from 'expo-blur';
import { CustomTabBar } from '../components/CustomTabBar';

cssInterop(BlurView, { className: "style" });

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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
            <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
            <Stack.Screen
                name="Actors"
                component={ActorsScreen}
                options={{
                    headerShown: true,
                    headerTitle: 'Select Customer',
                    headerBackTitle: 'Back',
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#FFFFFF' },
                }}
            />
            <Stack.Screen name="Addresses" component={AddressesScreen} />
        </Stack.Navigator>
    );
}
