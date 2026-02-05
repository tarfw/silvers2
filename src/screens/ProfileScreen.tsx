import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const Colors = {
    background: '#FFFFFF',
    text: '#000000',
    textSecondary: '#636366',
    danger: '#FF3B30',
    separator: '#F2F2F7',
};

export function ProfileScreen() {
    const { signOut, user } = useAuth();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Profile</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.profileCard}>
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                            {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.emailLabel}>Logged in as</Text>
                        <Text style={styles.emailText}>{user?.email}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
                        <Text style={styles.signOutText}>Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </View>
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
        borderBottomWidth: 1,
        borderBottomColor: Colors.separator,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: Colors.text,
        letterSpacing: -0.5,
    },
    content: {
        flex: 1,
        padding: 20,
        paddingBottom: 100, // Safe area for tab bar
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#F9F9FB',
        borderRadius: 16,
        marginBottom: 32,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '600',
    },
    userInfo: {
        flex: 1,
    },
    emailLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    emailText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    section: {
        marginTop: 'auto',
    },
    signOutButton: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: Colors.danger,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    signOutText: {
        color: Colors.danger,
        fontSize: 16,
        fontWeight: '600',
    },
});
