import React, { useState, useCallback } from 'react';
import { View, Text, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

interface Actor {
    id: string;
    name: string;
    globalcode: string;
    actortype: string;
}

export function ActorsScreen() {
    const navigation = useNavigation<any>();
    const { db } = useAuth();
    const [actors, setActors] = useState<Actor[]>([]);
    const [filteredActors, setFilteredActors] = useState<Actor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const loadActors = useCallback(async () => {
        if (!db) return;
        setIsLoading(true);

        try {
            // Get all 'user' type actors
            const rows = await db.all(`
                SELECT id, name, globalcode, actortype
                FROM actors
                WHERE actortype = 'user'
                ORDER BY name ASC
            `) as Actor[];

            setActors(rows);
            setFilteredActors(rows);
        } catch (error) {
            console.error('Error loading actors:', error);
        } finally {
            setIsLoading(false);
        }
    }, [db]);

    useFocusEffect(
        useCallback(() => {
            loadActors();
        }, [loadActors])
    );

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setFilteredActors(actors);
            return;
        }
        const lowerQuery = query.toLowerCase();
        const filtered = actors.filter(a =>
            a.name.toLowerCase().includes(lowerQuery) ||
            a.globalcode.toLowerCase().includes(lowerQuery)
        );
        setFilteredActors(filtered);
    };

    const handleSelect = (actor: Actor) => {
        // Return selected actor to the previous screen
        navigation.navigate('CheckoutAddress' as any, { selectedActor: actor });
    };

    const renderItem = ({ item }: { item: Actor }) => (
        <TouchableOpacity
            className="flex-row items-center p-5 border-b border-silver-100 bg-white"
            onPress={() => handleSelect(item)}
        >
            <View className="w-12 h-12 rounded-full bg-silver-50 items-center justify-center border border-silver-100">
                <Text className="text-lg font-bold text-black">{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View className="ml-4 flex-1">
                <Text className="text-base font-bold text-black">{item.name}</Text>
                <Text className="text-sm text-brand-secondary">{item.globalcode}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#AEAEB2" />
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-white">
            <SafeAreaView className="flex-1">
                {/* Search Bar */}
                <View className="px-5 py-3 border-b border-silver-100 bg-white">
                    <View className="flex-row items-center bg-silver-50 rounded-2xl px-4 py-2 border border-silver-100">
                        <Ionicons name="search" size={20} color="#AEAEB2" />
                        <TextInput
                            className="flex-1 ml-3 h-10 text-base text-black"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChangeText={handleSearch}
                            autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => handleSearch('')}>
                                <Ionicons name="close-circle" size={20} color="#AEAEB2" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {isLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator color="#000" />
                    </View>
                ) : filteredActors.length === 0 ? (
                    <View className="flex-1 items-center justify-center px-10">
                        <Text className="text-lg font-bold text-black mb-2">No users found</Text>
                        <Text className="text-base text-brand-secondary text-center">
                            Could not find any users matching your search.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredActors}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </SafeAreaView>
        </View>
    );
}
