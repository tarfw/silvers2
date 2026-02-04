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
    ActivityIndicator,
} from 'react-native';
import { useNodes } from '../hooks/useNodes';
import { useAuth } from '../contexts/AuthContext';
import { Node } from '../types';
import { storage } from '../lib/storage';
import { SecureImage } from '../components/SecureImage';

const Colors = {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    primary: '#000000',
    product: '#E5E5EA',
    category: '#E5E5EA',
    collection: '#E5E5EA',
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
            {node.nodetype === 'product' && (
                <SecureImage
                    source={{ uri: node.payload && typeof node.payload === 'object' ? (node.payload as any).image : '' }}
                    style={styles.nodeImage}
                    fallbackComponent={<View style={styles.nodeImagePlaceholder} />}
                />
            )}
            <View style={styles.nodeContent}>
                <Text style={styles.nodeTitle}>{node.title}</Text>
                <Text style={styles.nodeSubtitle}>
                    {node.nodetype} {node.universalcode ? `• ${node.universalcode}` : ''}
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
        </TouchableOpacity >
    );
}

export function NodesScreen() {
    const { nodes, isLoading, isSyncing, createNode, updateNode, deleteNode, pull, push, sync } = useNodes();
    const { signOut, user } = useAuth();

    // State for Add/Edit
    const [isModalVisible, setModalVisible] = useState(false);
    const [isTypeSelectionVisible, setTypeSelectionVisible] = useState(false);
    const [editingNode, setEditingNode] = useState<Node | null>(null);

    // Form State
    const [formTitle, setFormTitle] = useState('');
    const [formNodeType, setFormNodeType] = useState<'product' | 'category' | 'collection' | 'optionset' | 'option'>('product');
    const [formUniversalCode, setFormUniversalCode] = useState('');
    const [formParentId, setFormParentId] = useState<string | null>(null);
    const [formPayload, setFormPayload] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formImageUrl, setFormImageUrl] = useState('');
    const [formSelectedOptions, setFormSelectedOptions] = useState<string[]>([]);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const [isPushing, setIsPushing] = useState(false);

    // Parent Selection State
    const [isParentPickerVisible, setParentPickerVisible] = useState(false);
    const [parentSearchQuery, setParentSearchQuery] = useState('');
    const [parentTypeFilter, setParentTypeFilter] = useState<string>('category');
    const [isMultiSelectModalVisible, setIsMultiSelectModalVisible] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [isImageOptionsVisible, setIsImageOptionsVisible] = useState(false);

    const resetForm = () => {
        setFormTitle('');
        setFormNodeType('product');
        setFormUniversalCode('');
        setFormParentId(null);
        setFormPayload('');
        setFormDescription('');
        setFormImageUrl('');
        setFormSelectedOptions([]);
        setEditingNode(null);
        setIsImageOptionsVisible(false);
    };

    const handleOpenAdd = () => {
        setTypeSelectionVisible(true);
    };

    const handleSelectType = (type: 'product' | 'category' | 'collection' | 'optionset' | 'option') => {
        resetForm();
        setFormNodeType(type);
        setTypeSelectionVisible(false);
        setModalVisible(true);
    };

    const handleOpenEdit = (node: Node) => {
        setEditingNode(node);
        setFormTitle(node.title);
        setFormNodeType(node.nodetype);
        setFormUniversalCode(node.universalcode || '');
        setFormParentId(node.parentid || null);
        const parsed = node.payload as any;
        if (parsed) {
            setFormPayload(typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2));
            setFormDescription(parsed.description || '');
            setFormImageUrl(parsed.image || '');
            const rawOptions = parsed.options || [];
            if (rawOptions && typeof rawOptions === 'object' && !Array.isArray(rawOptions)) {
                // Handle grouped structure: { "Size": ["id1"], "Color": ["id2"] }
                setFormSelectedOptions(Object.values(rawOptions).flat() as string[]);
            } else {
                // Handle flat array structure
                setFormSelectedOptions(rawOptions);
            }
        } else {
            setFormPayload('');
            setFormDescription('');
            setFormImageUrl('');
            setFormSelectedOptions([]);
        }
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!formTitle.trim()) {
            Alert.alert('Error', 'Title is required');
            return;
        }

        let parsedPayload = null;
        if (formNodeType === 'category' || formNodeType === 'collection' || formNodeType === 'product') {
            parsedPayload = {
                description: formDescription.trim(),
                image: formImageUrl.trim(),
            };
            if (formNodeType === 'product') {
                // Group options by their parent title for better readability
                const groupedOptions: Record<string, string[]> = {};
                formSelectedOptions.forEach(optId => {
                    const optNode = nodes.find(n => n.id === optId);
                    const groupTitle = nodes.find(n => n.id === optNode?.parentid)?.title || 'General';
                    if (!groupedOptions[groupTitle]) groupedOptions[groupTitle] = [];
                    groupedOptions[groupTitle].push(optId);
                });
                (parsedPayload as any).options = groupedOptions;
            }
        } else if (formPayload.trim()) {
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
                    nodetype: formNodeType,
                    universalcode: formUniversalCode.trim(),
                    parentid: formParentId,
                    payload: parsedPayload,
                });
            } else {
                await createNode({
                    title: formTitle.trim(),
                    nodetype: formNodeType,
                    universalcode: formUniversalCode.trim(),
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

    const toggleOption = (id: string) => {
        setFormSelectedOptions(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const formatNodeType = (type: string) => {
        if (type === 'optionset') return 'Options Group';
        return type.charAt(0).toUpperCase() + type.slice(1);
    };

    const getParentTypesFor = (type: string): string[] => {
        switch (type) {
            case 'category': return ['category'];
            case 'collection': return ['collection'];
            case 'option': return ['optionset'];
            default: return ['category', 'collection', 'product', 'optionset', 'option'];
        }
    };

    const shouldShowParentId = (type: string) => {
        return type !== 'product' && type !== 'optionset' && type !== 'collection';
    };

    const availableParents = nodes.filter(n => {
        const typeMatches = n.nodetype === parentTypeFilter;
        const isNotSelf = editingNode ? n.id !== editingNode.id : true;
        const matchesSearch = n.title.toLowerCase().includes(parentSearchQuery.toLowerCase()) ||
            (n.universalcode || '').toLowerCase().includes(parentSearchQuery.toLowerCase());

        return typeMatches && isNotSelf && matchesSearch;
    });

    const selectedParentName = nodes.find(n => n.id === formParentId)?.title || formParentId || 'None';

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

            {/* Type Selection Bottom Drawer */}
            <Modal
                visible={isTypeSelectionVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setTypeSelectionVisible(false)}
            >
                <View style={styles.drawerOverlay}>
                    <TouchableOpacity
                        style={styles.drawerDismiss}
                        activeOpacity={1}
                        onPress={() => setTypeSelectionVisible(false)}
                    />
                    <View style={styles.drawerContent}>
                        <View style={styles.drawerHandle} />
                        <Text style={styles.drawerTitle}>Create New</Text>
                        <TouchableOpacity
                            style={styles.drawerItem}
                            onPress={() => handleSelectType('product')}
                        >
                            <Text style={styles.drawerItemText}>Product</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.drawerItem}
                            onPress={() => handleSelectType('collection')}
                        >
                            <Text style={styles.drawerItemText}>Collection</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.drawerItem}
                            onPress={() => handleSelectType('category')}
                        >
                            <Text style={styles.drawerItemText}>Category</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.drawerItem}
                            onPress={() => handleSelectType('optionset')}
                        >
                            <Text style={styles.drawerItemText}>Options Group</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.drawerItem}
                            onPress={() => handleSelectType('option')}
                        >
                            <Text style={styles.drawerItemText}>Option</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

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
                        <Text style={styles.modalTitle}>
                            {editingNode ? 'Edit' : 'New'} {formatNodeType(formNodeType)}
                        </Text>
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

                        {formNodeType === 'product' && (
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Universal Code</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="GTIN / Service Code"
                                    placeholderTextColor={Colors.textSecondary}
                                    value={formUniversalCode}
                                    onChangeText={setFormUniversalCode}
                                />
                            </View>
                        )}

                        {shouldShowParentId(formNodeType) && (
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Parent</Text>
                                <TouchableOpacity
                                    style={styles.selectorButton}
                                    onPress={() => {
                                        const allowedTypes = getParentTypesFor(formNodeType);
                                        setParentTypeFilter(allowedTypes[0]);
                                        setParentSearchQuery('');
                                        setParentPickerVisible(true);
                                    }}
                                >
                                    <Text style={[
                                        styles.selectorButtonText,
                                        !formParentId && { color: Colors.textSecondary }
                                    ]}>
                                        {selectedParentName}
                                    </Text>
                                    <Text style={styles.selectorActionText}>Change</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {(formNodeType === 'category' || formNodeType === 'collection' || formNodeType === 'product') && (
                            <>
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Image</Text>
                                    <TouchableOpacity
                                        style={styles.minimalImageContainer}
                                        onPress={() => setIsImageOptionsVisible(true)}
                                        activeOpacity={0.8}
                                    >
                                        {formImageUrl ? (
                                            <SecureImage
                                                source={{ uri: formImageUrl }}
                                                style={styles.minimalImagePreview}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View style={styles.minimalImagePlaceholder}>
                                                <Text style={styles.minimalImagePlaceholderText}>+ Add Image</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Description</Text>
                                    <TextInput
                                        style={[styles.modalInput, styles.textArea]}
                                        placeholder="Enter description"
                                        placeholderTextColor={Colors.textSecondary}
                                        value={formDescription}
                                        onChangeText={setFormDescription}
                                        multiline
                                        numberOfLines={4}
                                        textAlignVertical="top"
                                    />
                                </View>
                                {formNodeType === 'product' && (
                                    <View style={styles.formGroup}>
                                        <Text style={styles.label}>Options</Text>
                                        <TouchableOpacity
                                            style={styles.selectorButton}
                                            onPress={() => {
                                                setParentTypeFilter('option');
                                                setParentSearchQuery('');
                                                setIsMultiSelectModalVisible(true);
                                            }}
                                        >
                                            <View style={{ flex: 1 }}>
                                                {formSelectedOptions.length === 0 ? (
                                                    <Text style={{ color: Colors.textSecondary, fontSize: 16 }}>None Selected</Text>
                                                ) : (
                                                    Object.entries(
                                                        formSelectedOptions.reduce((acc, optId) => {
                                                            const optNode = nodes.find(n => n.id === optId);
                                                            const groupTitle = nodes.find(n => n.id === optNode?.parentid)?.title || 'General';
                                                            if (!acc[groupTitle]) acc[groupTitle] = [];
                                                            if (optNode) acc[groupTitle].push(optNode.title);
                                                            return acc;
                                                        }, {} as Record<string, string[]>)
                                                    ).map(([group, titles]) => (
                                                        <Text key={group} style={styles.selectedOptionGroupText}>
                                                            <Text style={{ fontWeight: '600' }}>{group}:</Text> {titles.join(', ')}
                                                        </Text>
                                                    ))
                                                )}
                                            </View>
                                            <Text style={styles.selectorActionText}>Select</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </>
                        )}
                    </ScrollView>
                </View>
            </Modal>

            {/* Image Options Drawer */}
            <Modal
                visible={isImageOptionsVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsImageOptionsVisible(false)}
            >
                <TouchableOpacity
                    style={styles.drawerOverlay}
                    activeOpacity={1}
                    onPress={() => setIsImageOptionsVisible(false)}
                >
                    <View style={styles.drawerContent}>
                        <View style={styles.drawerHandle} />
                        <Text style={styles.drawerTitle}>Image Options</Text>

                        <View style={styles.drawerContentPadding}>
                            <Text style={[styles.label, { marginBottom: 8 }]}>Image URL</Text>
                            <TextInput
                                style={[styles.modalInput, { marginBottom: 16 }]}
                                placeholder="https://example.com/image.jpg"
                                placeholderTextColor={Colors.textSecondary}
                                value={formImageUrl}
                                onChangeText={setFormImageUrl}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />

                            <TouchableOpacity
                                style={[styles.uploadButton, { marginBottom: 12 }]}
                                onPress={async () => {
                                    setIsUploading(true);
                                    try {
                                        const result = await storage.uploadImage();
                                        if (result) setFormImageUrl(result.publicUrl);
                                        // setIsImageOptionsVisible(false); // Close drawer on success? Or keep open to see URL update? 
                                        // Let's keep it open so they see the URL change, or we can close it. 
                                        // User asked for "url, replace, remove all come as bottom drawer", so keep it there.
                                    } catch (e: any) {
                                        Alert.alert('Upload Failed', e.message);
                                    } finally {
                                        setIsUploading(false);
                                    }
                                }}
                                disabled={isUploading}
                            >
                                {isUploading ? (
                                    <ActivityIndicator size="small" color={Colors.primary} />
                                ) : (
                                    <Text style={styles.uploadButtonText}>
                                        {formImageUrl ? 'Replace Image' : 'Upload Image'}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            {formImageUrl ? (
                                <TouchableOpacity
                                    style={[styles.removeImageButton, { alignSelf: 'stretch', alignItems: 'center' }]}
                                    onPress={() => {
                                        setFormImageUrl('');
                                        // setIsImageOptionsVisible(false); // Optional: close on remove
                                    }}
                                >
                                    <Text style={styles.removeImageText}>Remove Image</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Parent Selection Modal */}
            <Modal
                visible={isParentPickerVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setParentPickerVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setParentPickerVisible(false)}>
                            <Text style={styles.modalCloseText}>Back</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Select Parent</Text>
                        <TouchableOpacity onPress={() => {
                            setFormParentId(null);
                            setParentPickerVisible(false);
                        }}>
                            <Text style={styles.modalCloseText}>Clear</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search existing nodes..."
                            placeholderTextColor={Colors.textSecondary}
                            value={parentSearchQuery}
                            onChangeText={setParentSearchQuery}
                            autoFocus
                        />
                    </View>

                    {/* Only show type filter if multiple types are allowed */}
                    {getParentTypesFor(formNodeType).length > 1 && (
                        <View style={styles.pickerTypeFilterContainer}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerTypeFilterScroll}>
                                {getParentTypesFor(formNodeType).map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.pickerTypeButton,
                                            parentTypeFilter === type && styles.pickerTypeButtonActive
                                        ]}
                                        onPress={() => setParentTypeFilter(type)}
                                    >
                                        <Text style={[
                                            styles.pickerTypeText,
                                            parentTypeFilter === type && styles.pickerTypeTextActive
                                        ]}>
                                            {formatNodeType(type)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <FlatList
                        data={availableParents}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.parentSelectItem}
                                onPress={() => {
                                    setFormParentId(item.id);
                                    setParentPickerVisible(false);
                                }}
                            >
                                <View style={styles.nodeContent}>
                                    <Text style={styles.nodeTitle}>{item.title}</Text>
                                    <Text style={styles.nodeSubtitle}>
                                        {formatNodeType(item.nodetype)} {item.universalcode ? `• ${item.universalcode}` : ''}
                                    </Text>
                                </View>
                                {formParentId === item.id && (
                                    <View style={styles.checkMark} />
                                )}
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>
                                    {parentSearchQuery ? 'No matching nodes' : `No existing ${formatNodeType(parentTypeFilter).toLowerCase()}s found`}
                                </Text>
                            </View>
                        }
                    />
                </View>
            </Modal>

            {/* Multi-Select Options Modal */}
            <Modal
                visible={isMultiSelectModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsMultiSelectModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setIsMultiSelectModalVisible(false)}>
                            <Text style={styles.modalCloseText}>Done</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Select Options</Text>
                        <TouchableOpacity onPress={() => setFormSelectedOptions([])}>
                            <Text style={styles.modalCloseText}>Clear</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search options..."
                            placeholderTextColor={Colors.textSecondary}
                            value={parentSearchQuery}
                            onChangeText={setParentSearchQuery}
                        />
                    </View>

                    <FlatList
                        data={nodes.filter(n =>
                            n.nodetype === 'option' &&
                            n.title.toLowerCase().includes(parentSearchQuery.toLowerCase())
                        )}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.parentSelectItem}
                                onPress={() => toggleOption(item.id)}
                            >
                                <View style={styles.nodeContent}>
                                    <Text style={styles.nodeTitle}>{item.title}</Text>
                                    <Text style={styles.nodeSubtitle}>
                                        {nodes.find(n => n.id === item.parentid)?.title || 'No Group'}
                                    </Text>
                                </View>
                                {formSelectedOptions.includes(item.id) && (
                                    <View style={styles.checkMark} />
                                )}
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No options found</Text>
                            </View>
                        }
                    />
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
        textTransform: 'capitalize',
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
    selectorButton: {
        backgroundColor: '#FAFAFA',
        borderRadius: 8,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectorButtonText: {
        fontSize: 16,
        color: Colors.text,
        flex: 1,
    },
    selectorActionText: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontWeight: '500',
        marginLeft: 12,
    },
    searchContainer: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.separator,
    },
    searchInput: {
        backgroundColor: '#FAFAFA',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: Colors.text,
    },
    parentSelectItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: Colors.separator,
    },
    checkMark: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.primary,
        marginLeft: 12,
    },
    pickerTypeFilterContainer: {
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.separator,
    },
    pickerTypeFilterScroll: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    pickerTypeButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F2F2F7',
        marginRight: 8,
    },
    pickerTypeButtonActive: {
        backgroundColor: Colors.primary,
    },
    pickerTypeText: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.textSecondary,
    },
    pickerTypeTextActive: {
        color: Colors.surface,
    },
    selectedOptionGroupText: {
        fontSize: 15,
        color: Colors.text,
        marginBottom: 2,
    },
    typeTextActive: {
        color: Colors.surface,
    },
    readOnlyTypeContainer: {
        backgroundColor: '#F2F2F7',
        borderRadius: 8,
        padding: 16,
    },
    readOnlyTypeText: {
        fontSize: 16,
        color: Colors.textSecondary,
        textTransform: 'capitalize',
        fontWeight: '500',
    },
    /* Drawer Styles */
    drawerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    drawerDismiss: {
        flex: 1,
    },
    drawerContent: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        paddingHorizontal: 24,
    },
    drawerHandle: {
        width: 40,
        height: 5,
        backgroundColor: Colors.separator,
        borderRadius: 2.5,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 20,
    },
    drawerTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        color: Colors.text,
    },
    drawerItem: {
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: Colors.separator,
    },
    drawerItemText: {
        fontSize: 17,
        fontWeight: '400',
        color: Colors.text,
    },
    /* Image and Upload Styles */
    nodeImage: {
        width: 44,
        height: 44,
        borderRadius: 8,
        marginRight: 12,
        backgroundColor: '#F2F2F7',
    },
    nodeImagePlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 8,
        marginRight: 12,
        backgroundColor: '#F2F2F7',
    },
    /* Minimal Image Edit Styles */
    minimalImageContainer: {
        height: 200,
        backgroundColor: '#F2F2F7',
        borderRadius: 12,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    minimalImagePreview: {
        width: '100%',
        height: '100%',
    },
    minimalImagePlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    minimalImagePlaceholderText: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: '500',
    },
    drawerContentPadding: {
        paddingTop: 8,
    },

    uploadButton: {
        marginTop: 12,
        backgroundColor: '#FAFAFA',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: Colors.separator,
    },
    uploadButtonText: {
        color: Colors.text,
        fontSize: 14,
        fontWeight: '500',
    },
    imagePreviewContainer: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
        padding: 8,
        borderRadius: 12,
    },
    imagePreview: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    removeImageButton: {
        marginLeft: 16,
        padding: 8,
    },
    removeImageText: {
        color: Colors.danger,
        fontSize: 14,
        fontWeight: '500',
    },
});
