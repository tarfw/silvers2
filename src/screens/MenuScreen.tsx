import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const Colors = {
    background: '#FFFFFF',
    text: '#000000',
    textSecondary: '#636366',
    separator: '#F2F2F7',
};

const MENU_ITEMS = [
    { id: 'all', title: 'All', iconName: 'cube' as const },
    { id: 'sales', title: 'Sales', iconName: 'pricetag' as const },
    { id: 'new', title: 'New Arrivals', iconName: 'sparkles' as const },
    { id: 'orders', title: 'My Orders', iconName: 'list' as const },
    { id: 'settings', title: 'Settings', iconName: 'settings-sharp' as const },
];

export function MenuScreen() {
    const navigation = useNavigation<any>();

    const handlePress = (id: string) => {
        if (id === 'all') {
            navigation.navigate('Nodes');
        } else {
            // Placeholder for other items
            console.log('Pressed', id);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Menu</Text>
            </View>

            <ScrollView style={styles.content}>
                {MENU_ITEMS.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.menuItem}
                        onPress={() => handlePress(item.id)}
                    >
                        <View style={styles.itemIcon}>
                            <Ionicons name={item.iconName} size={20} color="#000" />
                        </View>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <Text style={styles.arrow}>›</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: Colors.text,
        letterSpacing: -0.5,
    },
    content: {
        flex: 1,
        paddingBottom: 100, // Safe area for tab bar
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.separator,
    },
    itemIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#F9F9FB',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    itemTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: Colors.text,
    },
    arrow: {
        fontSize: 24,
        color: '#C7C7CC',
        marginLeft: 8,
    },
});
