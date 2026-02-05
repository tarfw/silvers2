import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const Colors = {
    background: '#FFFFFF',
    text: '#000000',
    textSecondary: '#636366',
    danger: '#FF3B30',
    separator: '#F2F2F7',
    surface: '#F9F9FB',
};

export function ProfileScreen() {
    const { signOut, user } = useAuth();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Account</Text>
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.infoSection}>
                    <Text style={styles.sectionLabel}>User Details</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Email</Text>
                        <Text style={styles.infoValue}>{user?.email}</Text>
                    </View>
                    <View style={styles.separator} />
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Role</Text>
                        <Text style={styles.infoValue}>Administrator</Text>
                    </View>
                </View>

                <View style={styles.infoSection}>
                    <Text style={styles.sectionLabel}>Actions</Text>
                    <TouchableOpacity style={styles.actionRow} onPress={signOut}>
                        <Text style={styles.signOutText}>Sign Out</Text>
                        <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
                    </TouchableOpacity>
                </View>
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
        paddingTop: 8,
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
    },
    infoSection: {
        marginTop: 12,
        marginBottom: 32,
        paddingHorizontal: 20,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
        marginLeft: 4,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
    },
    infoLabel: {
        fontSize: 16,
        color: Colors.text,
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 16,
        color: Colors.textSecondary,
    },
    separator: {
        height: 1,
        backgroundColor: Colors.separator,
        marginVertical: 4,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: Colors.surface,
        borderRadius: 12,
    },
    signOutText: {
        color: Colors.danger,
        fontSize: 16,
        fontWeight: '600',
    },
});
