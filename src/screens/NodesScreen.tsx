import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    TextInput,
    Platform,
    Alert,
    Modal,
    ScrollView,
} from 'react-native';
import { useNodes } from '../hooks/useNodes';
import { useAuth } from '../contexts/AuthContext';
import { Node } from '../types';

const Colors = {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    primary: '#000000',
    product: '#E5E5EA',
    service: '#E5E5EA',
    text: '#000000',
    textSecondary: '#636366',
    separator: '#F2F2F7',
    danger: '#FF3B30',
};

// Sync Button Component
function SyncButton({
    title,
    onPress,
    isLoading,
}: {
    title: string;
    onPress: () => void;
    isLoading: boolean;
}) {
    return (
        <TouchableOpacity
            style={styles.syncButton}
            onPress={onPress}
            disabled={isLoading}
            activeOpacity={0.6}
        >
            <Text style={[styles.syncButtonText, isLoading && { opacity: 0.3 }]}>{title}</Text>
        </TouchableOpacity>
    );
}

function NodeItem({
    node,
    onDelete,
    onEdit
}: {
    node: Node;
    onDelete: (id: string) => void;
    onEdit: (node: Node) => void;
}) {
    return (
        <TouchableOpacity style={styles.nodeItem} onPress={() => onEdit(node)} activeOpacity={0.6}>
            <View style={styles.nodeContent}>
                <Text style={styles.nodeTitle}>{node.title}</Text>
                <Text style={styles.nodeSubtitle}>
                    {node.type} {node.unicode ? `• ${node.unicode}` : ''}
                </Text>
            </View>
            <TouchableOpacity
                onPress={(e) => {
                    e.stopPropagation();
                    onDelete(node.id);
                }}
                style={styles.deleteButton}
            >
                <Text style={styles.deleteButtonText}>Remove</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

export function NodesScreen() {
    const { nodes, isLoading, isSyncing, createNode, updateNode, deleteNode, pull, push, sync } = useNodes();
    const { signOut, user } = useAuth();

    // State for Add/Edit
    const [isModalVisible, setModalVisible] = useState(false);
    const [editingNode, setEditingNode] = useState<Node | null>(null);

    // Form State
    const [formTitle, setFormTitle] = useState('');
    const [formType, setFormType] = useState<'product' | 'service'>('product');
    const [formUnicode, setFormUnicode] = useState('');
    const [formParentId, setFormParentId] = useState<string | null>(null);
    const [formPayload, setFormPayload] = useState('');

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const [isPushing, setIsPushing] = useState(false);

    const resetForm = () => {
        setFormTitle('');
        setFormType('product');
        setFormUnicode('');
        setFormParentId(null);
        setFormPayload('');
        setEditingNode(null);
    };

    const handleOpenAdd = () => {
        resetForm();
        setModalVisible(true);
    };

    const handleOpenEdit = (node: Node) => {
        setEditingNode(node);
        setFormTitle(node.title);
        setFormType(node.type);
        setFormUnicode(node.unicode || '');
        setFormParentId(node.parentid || null);
        setFormPayload(node.payload ? JSON.stringify(node.payload, null, 2) : '');
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!formTitle.trim()) {
            Alert.alert('Error', 'Title is required');
            return;
        }

        let parsedPayload = null;
        if (formPayload.trim()) {
            try {
                parsedPayload = JSON.parse(formPayload);
            } catch (e) {
                Alert.alert('Error', 'Invalid JSON in payload');
                return;
            }
        }

        try {
            if (editingNode) {
                await updateNode(editingNode.id, {
                    title: formTitle.trim(),
                    type: formType,
                    unicode: formUnicode.trim() || undefined,
                    parentid: formParentId,
                    payload: parsedPayload,
                });
            } else {
                await createNode({
                    title: formTitle.trim(),
                    type: formType,
                    unicode: formUnicode.trim() || undefined,
                    parentid: formParentId,
                    payload: parsedPayload,
                });
            }
            setModalVisible(false);
            resetForm();
        } catch (error: any) {
            console.error('Save error:', error);
            Alert.alert('Error', `Failed to save node: ${error.message || 'Unknown error'}`);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await sync();
        } catch (e) {
            Alert.alert('Sync Failed', 'Check connections. If a foreign key error exists, try Pulling first.');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handlePull = async () => {
        setIsPulling(true);
        try {
            await pull();
        } catch (e) {
            Alert.alert('Pull Failed', 'Could not fetch updates from cloud.');
        } finally {
            setTimeout(() => setIsPulling(false), 500);
        }
    };

    const handlePush = async () => {
        setIsPushing(true);
        try {
            await push();
        } catch (e: any) {
            if (e.message?.includes('FOREIGN KEY')) {
                Alert.alert('Push Failed', 'A node depends on a parent that does not exist in the cloud yet. Try Pulling first.');
            } else {
                Alert.alert('Push Failed', 'Could not upload updates to cloud.');
            }
        } finally {
            setTimeout(() => setIsPushing(false), 500);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Delete Node',
            'Are you sure you want to delete this node?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteNode(id)
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.headerTitle}>Nodes</Text>
                    <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
                        <Text style={styles.signOutText}>Sign Out</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.userEmail}>{user?.email}</Text>
            </View>

            <FlatList
                data={nodes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <NodeItem
                        node={item}
                        onDelete={handleDelete}
                        onEdit={handleOpenEdit}
                    />
                )}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            {isLoading ? 'Loading...' : 'No items found'}
                        </Text>
                    </View>
                }
            />

            <TouchableOpacity style={styles.fab} onPress={handleOpenAdd}>
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>

            {/* Bottom Sync Bar */}
            <View style={styles.syncBar}>
                <View style={styles.syncButtons}>
                    <SyncButton title="Pull" onPress={handlePull} isLoading={isPulling} />
                    <SyncButton title="Push" onPress={handlePush} isLoading={isPushing} />
                </View>
                <Text style={styles.syncStatus}>
                    {isPulling || isPushing || isSyncing ? 'syncing' : 'synced'}
                </Text>
            </View>

            {/* Add/Edit Modal */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Text style={styles.modalCloseText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>{editingNode ? 'Edit' : 'New'}</Text>
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={styles.modalSaveText}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalScroll}>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Title</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Enter title"
                                placeholderTextColor={Colors.textSecondary}
                                value={formTitle}
                                onChangeText={setFormTitle}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Type</Text>
                            <View style={styles.typeSelector}>
                                <TouchableOpacity
                                    style={[styles.typeButton, formType === 'product' && styles.typeButtonActive]}
                                    onPress={() => setFormType('product')}
                                >
                                    <Text style={[styles.typeText, formType === 'product' && styles.typeTextActive]}>Product</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.typeButton, formType === 'service' && styles.typeButtonActive]}
                                    onPress={() => setFormType('service')}
                                >
                                    <Text style={[styles.typeText, formType === 'service' && styles.typeTextActive]}>Service</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Unicode</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Optional"
                                placeholderTextColor={Colors.textSecondary}
                                value={formUnicode}
                                onChangeText={setFormUnicode}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Parent ID</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Optional"
                                placeholderTextColor={Colors.textSecondary}
                                value={formParentId || ''}
                                onChangeText={(val) => setFormParentId(val || null)}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Payload</Text>
                            <TextInput
                                style={[styles.modalInput, styles.textArea]}
                                placeholder='{}'
                                placeholderTextColor={Colors.textSecondary}
                                value={formPayload}
                                onChangeText={setFormPayload}
                                multiline
                                numberOfLines={6}
                                textAlignVertical="top"
                            />
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 24,
        backgroundColor: Colors.surface,
        paddingBottom: 16,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '600',
        color: Colors.text,
        letterSpacing: -0.5,
    },
    userEmail: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    signOutButton: {
        paddingVertical: 4,
    },
    signOutText: {
        color: Colors.textSecondary,
        fontSize: 14,
        fontWeight: '400',
    },
    list: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 160,
    },
    nodeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.separator,
    },
    nodeContent: {
        flex: 1,
    },
    nodeTitle: {
        fontSize: 17,
        fontWeight: '500',
        color: Colors.text,
    },
    nodeSubtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
        textTransform: 'lowercase',
    },
    deleteButton: {
        paddingLeft: 12,
    },
    deleteButtonText: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: '400',
    },
    fab: {
        position: 'absolute',
        bottom: 110,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fabText: {
        color: Colors.surface,
        fontSize: 24,
        fontWeight: '300',
    },
    syncBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.separator,
        paddingVertical: 16,
        paddingHorizontal: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    syncButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    syncButton: {
        marginRight: 24,
    },
    syncButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.text,
    },
    syncStatus: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '400',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        color: Colors.textSecondary,
        fontSize: 15,
    },
    /* Modal Styles */
    modalContainer: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.separator,
    },
    modalCloseText: {
        color: Colors.textSecondary,
        fontSize: 16,
    },
    modalSaveText: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    modalScroll: {
        flex: 1,
        padding: 24,
    },
    formGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '500',
    },
    modalInput: {
        backgroundColor: '#FAFAFA',
        borderRadius: 8,
        padding: 16,
        fontSize: 16,
        color: Colors.text,
    },
    textArea: {
        height: 120,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    typeSelector: {
        flexDirection: 'row',
        backgroundColor: '#FAFAFA',
        padding: 4,
        borderRadius: 8,
    },
    typeButton: {
        flex: 1,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 6,
    },
    typeButtonActive: {
        backgroundColor: Colors.primary,
    },
    typeText: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.textSecondary,
    },
    typeTextActive: {
        color: Colors.surface,
    },
});
