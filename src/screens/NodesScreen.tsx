// Modern tab-based NodesScreen with premium design
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    RefreshControl,
    TextInput,
    Platform,
    Alert,
    Modal,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNodes } from '../hooks/useNodes';
import { useAuth } from '../contexts/AuthContext';
import { Node } from '../types';
import { storage } from '../lib/storage';
import { SecureImage } from '../components/SecureImage';

function NodeItem({
    node,
    onDelete,
    onEdit
}: {
    node: Node;
    onDelete: (node: Node) => void;
    onEdit: (node: Node) => void;
}) {
    const payload = node.payload && typeof node.payload === 'object' ? (node.payload as any) : {};

    return (
        <TouchableOpacity
            onPress={() => onEdit(node)}
            onLongPress={() => onDelete(node)}
            className="flex-row items-center py-5 px-6 border-b border-silver-100/50 active:bg-silver-50"
            activeOpacity={0.7}
        >
            {(node.nodetype === 'product' || node.nodetype === 'category' || node.nodetype === 'collection') && (
                <View className="w-14 h-14 rounded-md bg-silver-50 border border-silver-100 items-center justify-center overflow-hidden">
                    <SecureImage
                        source={{ uri: payload.image }}
                        className="w-full h-full"
                        fallbackComponent={<Ionicons name="cube-outline" size={24} color="#AEAEB2" />}
                    />
                </View>
            )}

            <View className={`flex-1 ${(node.nodetype === 'product' || node.nodetype === 'category' || node.nodetype === 'collection') ? 'ml-4' : ''} justify-center`}>
                <Text className="text-[17px] font-bold text-black tracking-tight mb-1">{node.title}</Text>
                <View className="flex-row items-center">
                    <View className="bg-silver-100 px-2 py-0.5 rounded-md mr-2">
                        <Text className="text-[9px] font-bold text-brand-secondary uppercase tracking-widest">
                            {node.nodetype === 'optionset' ? 'Group' : node.nodetype}
                        </Text>
                    </View>
                    {node.universalcode ? (
                        <Text className="text-[12px] font-medium text-brand-secondary">
                            {node.universalcode}
                        </Text>
                    ) : null}
                </View>
            </View>

            <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
        </TouchableOpacity>
    );
}

export function NodesScreen() {
    const { nodes, isLoading, isSyncing, createNode, updateNode, deleteNode, pull, push, sync } = useNodes();
    const { } = useAuth();

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

    const [filterType, setFilterType] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [isDeleteDrawerVisible, setIsDeleteDrawerVisible] = useState(false);
    const [nodeToDelete, setNodeToDelete] = useState<Node | null>(null);

    const [isRefreshing, setIsRefreshing] = useState(false);

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


    const handleDelete = (node: Node) => {
        setNodeToDelete(node);
        setIsDeleteDrawerVisible(true);
    };

    const confirmDelete = async () => {
        if (nodeToDelete) {
            try {
                await deleteNode(nodeToDelete.id);
                setIsDeleteDrawerVisible(false);
                setNodeToDelete(null);
            } catch (error: any) {
                Alert.alert('Error', `Failed to delete node: ${error.message}`);
            }
        }
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

    const filteredNodes = nodes.filter(node => {
        const matchesType = filterType === 'all' ? true : node.nodetype === filterType;
        const matchesSearch = !searchQuery.trim() ||
            node.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (node.universalcode || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

    const filterTabs = [
        { label: 'All', value: 'all', icon: 'apps-outline' },
        { label: 'Products', value: 'product', icon: 'cube-outline' },
        { label: 'Collections', value: 'collection', icon: 'albums-outline' },
        { label: 'Categories', value: 'category', icon: 'grid-outline' },
        { label: 'Groups', value: 'optionset', icon: 'layers-outline' },
        { label: 'Options', value: 'option', icon: 'list-outline' },
    ];

    return (
        <View className="flex-1 bg-white">
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Modern Header */}
                <View className="px-6 pt-6 pb-4">
                    <View className="flex-row justify-between items-end mb-6">
                        <View>
                            <Text className="text-[10px] font-bold text-brand-secondary uppercase tracking-[2.5px] mb-1">Catalog Manager</Text>
                            <Text className="text-4xl font-bold text-black tracking-tighter">All Items</Text>
                        </View>
                        {isSyncing && (
                            <ActivityIndicator size="small" color="#000" />
                        )}
                    </View>

                    {/* Integrated Search */}
                    <View className="flex-row items-center bg-silver-50 rounded-xl px-4 py-3 border border-silver-100">
                        <Ionicons name="search" size={18} color="#AEAEB2" />
                        <TextInput
                            className="flex-1 ml-3 text-[16px] font-medium text-black"
                            placeholder="Search by name or SKU..."
                            placeholderTextColor="#AEAEB2"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            clearButtonMode="while-editing"
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                {/* Tab Bar Navigation */}
                <View className="border-b border-silver-100">
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 20 }}
                    >
                        {filterTabs.map((tab) => {
                            const isActive = filterType === tab.value;
                            return (
                                <TouchableOpacity
                                    key={tab.value}
                                    onPress={() => setFilterType(tab.value)}
                                    activeOpacity={0.7}
                                    style={{ marginRight: 4 }}
                                >
                                    <View className={`px-4 py-3 border-b-2 ${isActive ? 'border-black' : 'border-transparent'}`}>
                                        <View className="flex-row items-center">
                                            <Ionicons
                                                name={tab.icon as any}
                                                size={16}
                                                color={isActive ? '#000' : '#8E8E93'}
                                            />
                                            <Text className={`ml-2 text-[13px] font-bold uppercase tracking-wider ${isActive ? 'text-black' : 'text-brand-secondary'}`}>
                                                {tab.label}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Main Content List */}
                <FlatList
                    data={filteredNodes}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <NodeItem
                            node={item}
                            onDelete={handleDelete}
                            onEdit={handleOpenEdit}
                        />
                    )}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            tintColor="#000"
                        />
                    }
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center pt-32 px-12">
                            <View className="w-20 h-20 bg-silver-50 rounded-full items-center justify-center mb-6">
                                <Ionicons name="search" size={32} color="#AEAEB2" />
                            </View>
                            <Text className="text-lg font-bold text-black text-center mb-2">
                                {isLoading ? 'Gathering products...' : 'No results found'}
                            </Text>
                            <Text className="text-sm font-medium text-brand-secondary text-center leading-5 uppercase tracking-tighter">
                                {searchQuery
                                    ? `We couldn't find anything matching "${searchQuery}"`
                                    : 'There are no items in this category yet. Start by creating a new one.'}
                            </Text>
                        </View>
                    }
                />
            </SafeAreaView>

            {/* Modern FAB */}
            <TouchableOpacity
                onPress={handleOpenAdd}
                activeOpacity={0.9}
                className="absolute bottom-10 right-6 w-16 h-16 bg-black rounded-2xl items-center justify-center shadow-2xl"
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.3,
                    shadowRadius: 16,
                    elevation: 10
                }}
            >
                <Ionicons name="add" size={32} color="#FFF" />
            </TouchableOpacity>


            {/* Type Selection Bottom Drawer */}
            <Modal
                visible={isTypeSelectionVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setTypeSelectionVisible(false)}
            >
                <View className="flex-1 justify-end">
                    <TouchableOpacity
                        className="absolute inset-0 bg-black/40"
                        onPress={() => setTypeSelectionVisible(false)}
                        activeOpacity={1}
                    />
                    <View className="bg-white rounded-t-3xl px-8 pt-4 pb-12 shadow-2xl">
                        <View className="w-12 h-1 bg-silver-100 rounded-full self-center mb-10" />
                        <Text className="text-[11px] font-bold text-brand-secondary uppercase tracking-[3px] mb-8 text-center">New Catalog Entry</Text>

                        <View className="bg-silver-50 rounded-2xl overflow-hidden border border-silver-100">
                            {[
                                { type: 'product', label: 'Product', icon: 'cube-outline' },
                                { type: 'collection', label: 'Collection', icon: 'albums-outline' },
                                { type: 'category', label: 'Category', icon: 'grid-outline' },
                                { type: 'optionset', label: 'Options Group', icon: 'layers-outline' },
                                { type: 'option', label: 'Option', icon: 'list-outline' }
                            ].map((item, index, arr) => (
                                <TouchableOpacity
                                    key={item.type}
                                    onPress={() => handleSelectType(item.type as any)}
                                    activeOpacity={0.7}
                                    className={`flex-row items-center px-6 py-5 ${index !== arr.length - 1 ? 'border-b border-white' : ''}`}
                                >
                                    <View className="w-10 h-10 rounded-xl bg-white shadow-sm border border-silver-50 items-center justify-center">
                                        <Ionicons name={item.icon as any} size={18} color="#000" />
                                    </View>
                                    <Text className="ml-4 flex-1 text-[15px] font-bold text-black uppercase tracking-wider">{item.label}</Text>
                                    <Ionicons name="chevron-forward" size={14} color="#AEAEB2" />
                                </TouchableOpacity>
                            ))}
                        </View>
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
                <View className="flex-1 bg-white">
                    {/* Modal Fixed Header */}
                    <View className="px-6 pt-6 pb-4 border-b border-silver-100 flex-row items-center justify-between">
                        <TouchableOpacity onPress={() => setModalVisible(false)} className="px-2" activeOpacity={0.7}>
                            <Text className="text-brand-secondary font-medium">Cancel</Text>
                        </TouchableOpacity>
                        <Text className="text-[17px] font-bold text-black tracking-tight">
                            {editingNode ? 'Edit' : 'New'} {formatNodeType(formNodeType)}
                        </Text>
                        <TouchableOpacity onPress={handleSave} className="bg-black px-5 py-2 rounded-full" activeOpacity={0.8}>
                            <Text className="text-[13px] font-bold text-white uppercase tracking-widest">Done</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        className="flex-1 px-6"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 60 }}
                    >
                        {/* Image Section */}
                        {(formNodeType === 'product' || formNodeType === 'category' || formNodeType === 'collection') && (
                            <View className="mt-8 mb-6">
                                <Text className="text-[10px] font-bold text-brand-secondary uppercase tracking-[2px] mb-4">Display Identity</Text>
                                <TouchableOpacity
                                    onPress={() => setIsImageOptionsVisible(true)}
                                    activeOpacity={0.7}
                                    className="w-full aspect-[4/3] bg-silver-50 rounded-xl border border-silver-100 overflow-hidden items-center justify-center p-4"
                                >
                                    {formImageUrl ? (
                                        <SecureImage source={{ uri: formImageUrl }} className="w-full h-full rounded-xl" />
                                    ) : (
                                        <View className="items-center">
                                            <View className="w-16 h-16 bg-white rounded-full items-center justify-center shadow-sm mb-4 border border-silver-50">
                                                <Ionicons name="image-outline" size={24} color="#AEAEB2" />
                                            </View>
                                            <Text className="text-[13px] font-bold text-brand-secondary uppercase tracking-widest">Tap to Add Image</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* General Info */}
                        <View className="mt-4">
                            <Text className="text-[10px] font-bold text-brand-secondary uppercase tracking-[2px] mb-4">Identification</Text>

                            <View className="mb-6">
                                <Text className="text-[12px] font-bold mb-2 ml-1 text-black uppercase tracking-tight">Public Title</Text>
                                <TextInput
                                    className="bg-silver-50 rounded-lg px-5 py-4 border border-silver-100 text-[16px] font-medium text-black"
                                    placeholder="Enter title..."
                                    placeholderTextColor="#AEAEB2"
                                    value={formTitle}
                                    onChangeText={setFormTitle}
                                />
                            </View>

                            <View className="mb-6">
                                <Text className="text-[12px] font-bold mb-2 ml-1 text-black uppercase tracking-tight">Universal ID / SKU</Text>
                                <TextInput
                                    className="bg-silver-50 rounded-lg px-5 py-4 border border-silver-100 text-[16px] font-medium text-black"
                                    placeholder="Optional unique code..."
                                    placeholderTextColor="#AEAEB2"
                                    value={formUniversalCode}
                                    onChangeText={setFormUniversalCode}
                                    autoCapitalize="characters"
                                />
                            </View>
                        </View>

                        {/* Node Specific Configs */}
                        {shouldShowParentId(formNodeType) && (
                            <View className="mb-6">
                                <Text className="text-[10px] font-bold text-brand-secondary uppercase tracking-[2px] mb-4">Structure</Text>
                                <Text className="text-[12px] font-bold mb-2 ml-1 text-black uppercase tracking-tight">Parent Group</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setParentTypeFilter(getParentTypesFor(formNodeType)[0]);
                                        setParentPickerVisible(true);
                                    }}
                                    activeOpacity={0.7}
                                    className="bg-silver-50 rounded-lg px-5 py-4 border border-silver-100 flex-row justify-between items-center"
                                >
                                    <Text className="text-[16px] font-medium text-black">{selectedParentName}</Text>
                                    <View className="flex-row items-center">
                                        <Text className="text-[11px] font-bold text-brand-secondary uppercase mr-2">Change</Text>
                                        <Ionicons name="chevron-forward" size={14} color="#AEAEB2" />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        )}

                        {formNodeType === 'product' && (
                            <View className="mb-6">
                                <Text className="text-[10px] font-bold text-brand-secondary uppercase tracking-[2px] mb-4">Attributes</Text>
                                <Text className="text-[12px] font-bold mb-2 ml-1 text-black uppercase tracking-tight">Selected Options</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setParentTypeFilter('option');
                                        setParentSearchQuery('');
                                        setIsMultiSelectModalVisible(true);
                                    }}
                                    activeOpacity={0.7}
                                    className="bg-silver-50 rounded-lg px-5 py-4 border border-silver-100 min-h-[56px] justify-center"
                                >
                                    {formSelectedOptions.length > 0 ? (
                                        <View className="flex-row flex-wrap gap-2">
                                            {formSelectedOptions.map(id => (
                                                <View key={id} className="bg-black px-3 py-1.5 rounded-full">
                                                    <Text className="text-[11px] font-bold text-white uppercase tracking-tight">
                                                        {nodes.find(n => n.id === id)?.title || id}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    ) : (
                                        <Text className="text-brand-secondary italic">Manage variants and options...</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}

                        <View className="mb-10">
                            <Text className="text-[10px] font-bold text-brand-secondary uppercase tracking-[2px] mb-4">Detailing</Text>
                            <Text className="text-[12px] font-bold mb-2 ml-1 text-black uppercase tracking-tight">Public Description</Text>
                            <TextInput
                                className="bg-silver-50 rounded-xl px-5 py-4 border border-silver-100 text-[16px] font-medium text-black min-h-[120px]"
                                placeholder="Describe this item..."
                                placeholderTextColor="#AEAEB2"
                                multiline
                                value={formDescription}
                                onChangeText={setFormDescription}
                                textAlignVertical="top"
                            />
                        </View>
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
                <View className="flex-1 justify-end">
                    <TouchableOpacity
                        className="absolute inset-0 bg-black/40"
                        onPress={() => setIsImageOptionsVisible(false)}
                        activeOpacity={1}
                    />
                    <View className="bg-white rounded-t-3xl px-8 pt-4 pb-12 shadow-2xl">
                        <View className="w-12 h-1 bg-silver-100 rounded-full self-center mb-10" />
                        <Text className="text-[11px] font-bold text-brand-secondary uppercase tracking-[3px] mb-8 text-center">Manage Media</Text>

                        <View className="bg-silver-50 rounded-2xl overflow-hidden border border-silver-100">
                            <TouchableOpacity
                                onPress={async () => {
                                    setIsUploading(true);
                                    try {
                                        const result = await storage.uploadImage();
                                        if (result) setFormImageUrl(result.publicUrl);
                                        setIsImageOptionsVisible(false);
                                    } catch (e: any) {
                                        Alert.alert('Upload Failed', e.message);
                                    } finally {
                                        setIsUploading(false);
                                    }
                                }}
                                disabled={isUploading}
                                activeOpacity={0.7}
                                className="flex-row items-center px-6 py-5 border-b border-white"
                            >
                                <View className="w-10 h-10 rounded-xl bg-white shadow-sm border border-silver-50 items-center justify-center">
                                    {isUploading ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="cloud-upload-outline" size={18} color="#000" />}
                                </View>
                                <Text className="ml-4 flex-1 text-[15px] font-bold text-black uppercase tracking-wider">{formImageUrl ? 'Replace Image' : 'Upload Image'}</Text>
                            </TouchableOpacity>

                            {formImageUrl && (
                                <TouchableOpacity
                                    onPress={() => {
                                        setFormImageUrl('');
                                        setIsImageOptionsVisible(false);
                                    }}
                                    activeOpacity={0.7}
                                    className="flex-row items-center px-6 py-5"
                                >
                                    <View className="w-10 h-10 rounded-xl bg-white shadow-sm border border-silver-50 items-center justify-center">
                                        <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                                    </View>
                                    <Text className="ml-4 flex-1 text-[15px] font-bold text-red-500 uppercase tracking-wider">Remove Identity</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Deletion Confirmation Drawer */}
            <Modal
                visible={isDeleteDrawerVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsDeleteDrawerVisible(false)}
            >
                <View className="flex-1 justify-end">
                    <TouchableOpacity
                        className="absolute inset-0 bg-black/40"
                        onPress={() => setIsDeleteDrawerVisible(false)}
                        activeOpacity={1}
                    />
                    <View className="bg-white rounded-t-3xl px-8 pt-4 pb-12 shadow-2xl">
                        <View className="w-12 h-1 bg-silver-100 rounded-full self-center mb-10" />

                        <View className="items-center mb-8">
                            <View className="w-20 h-20 bg-red-50 rounded-full items-center justify-center mb-6 border border-red-100">
                                <Ionicons name="alert-circle-outline" size={40} color="#FF3B30" />
                            </View>
                            <Text className="text-2xl font-bold text-black tracking-tight mb-2">Delete Item?</Text>
                            <Text className="text-[14px] font-medium text-brand-secondary text-center leading-5 uppercase tracking-tighter px-4">
                                You are about to permanently remove "{nodeToDelete?.title}". This action is irreversible.
                            </Text>
                        </View>

                        <View className="gap-3">
                            <TouchableOpacity
                                onPress={confirmDelete}
                                activeOpacity={0.9}
                                className="bg-red-500 py-5 rounded-xl items-center justify-center shadow-lg shadow-red-200"
                            >
                                <Text className="text-white font-bold uppercase tracking-[2px]">Confirm Destruction</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setIsDeleteDrawerVisible(false)}
                                activeOpacity={0.7}
                                className="bg-silver-50 py-5 rounded-xl items-center justify-center border border-silver-100"
                            >
                                <Text className="text-black font-bold uppercase tracking-[2px]">Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Parent Selection Modal */}
            <Modal
                visible={isParentPickerVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setParentPickerVisible(false)}
            >
                <View className="flex-1 bg-white">
                    <View className="px-6 pt-6 pb-4 border-b border-silver-100 flex-row items-center justify-between">
                        <TouchableOpacity onPress={() => setParentPickerVisible(false)} className="px-2" activeOpacity={0.7}>
                            <Text className="text-brand-secondary font-medium">Back</Text>
                        </TouchableOpacity>
                        <Text className="text-[17px] font-bold text-black tracking-tight">Select Parent</Text>
                        <TouchableOpacity onPress={() => { setFormParentId(null); setParentPickerVisible(false); }} className="px-2" activeOpacity={0.7}>
                            <Text className="text-red-500 font-bold uppercase text-[11px] tracking-widest">Clear</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="px-6 pt-4 pb-2">
                        <View className="flex-row items-center bg-silver-50 rounded-2xl px-4 py-3 border border-silver-100">
                            <Ionicons name="search" size={18} color="#AEAEB2" />
                            <TextInput
                                className="flex-1 ml-3 text-[16px] font-medium text-black"
                                placeholder="Search groups..."
                                placeholderTextColor="#AEAEB2"
                                value={parentSearchQuery}
                                onChangeText={setParentSearchQuery}
                                autoFocus
                            />
                        </View>
                    </View>

                    <FlatList
                        data={availableParents}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => { setFormParentId(item.id); setParentPickerVisible(false); }}
                                activeOpacity={0.7}
                                className="flex-row items-center py-4 px-6 border-b border-silver-100/50"
                            >
                                <View className="flex-1">
                                    <Text className="text-[16px] font-bold text-black mb-0.5">{item.title}</Text>
                                    <Text className="text-[11px] font-medium text-brand-secondary uppercase tracking-widest">
                                        {formatNodeType(item.nodetype)} {item.universalcode ? `• ${item.universalcode}` : ''}
                                    </Text>
                                </View>
                                {formParentId === item.id && (
                                    <View className="w-5 h-5 rounded-lg bg-black items-center justify-center">
                                        <Ionicons name="checkmark" size={12} color="#FFF" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        ListEmptyComponent={
                            <View className="items-center justify-center pt-20 px-12">
                                <Text className="text-sm font-medium text-brand-secondary text-center uppercase tracking-widest">
                                    {parentSearchQuery ? 'No matches found' : `No ${formatNodeType(parentTypeFilter).toLowerCase()}s available`}
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
                <View className="flex-1 bg-white">
                    <View className="px-6 pt-6 pb-4 border-b border-silver-100 flex-row items-center justify-between">
                        <TouchableOpacity onPress={() => setIsMultiSelectModalVisible(false)} className="px-2" activeOpacity={0.7}>
                            <Text className="text-black font-bold uppercase text-[11px] tracking-widest">Done</Text>
                        </TouchableOpacity>
                        <Text className="text-[17px] font-bold text-black tracking-tight">Select Options</Text>
                        <TouchableOpacity onPress={() => setFormSelectedOptions([])} className="px-2" activeOpacity={0.7}>
                            <Text className="text-red-500 font-bold uppercase text-[11px] tracking-widest">Clear All</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="px-6 pt-4 pb-2">
                        <View className="flex-row items-center bg-silver-50 rounded-2xl px-4 py-3 border border-silver-100">
                            <Ionicons name="search" size={18} color="#AEAEB2" />
                            <TextInput
                                className="flex-1 ml-3 text-[16px] font-medium text-black"
                                placeholder="Search all choices..."
                                placeholderTextColor="#AEAEB2"
                                value={parentSearchQuery}
                                onChangeText={setParentSearchQuery}
                            />
                        </View>
                    </View>

                    <FlatList
                        data={nodes.filter(n =>
                            n.nodetype === 'option' &&
                            n.title.toLowerCase().includes(parentSearchQuery.toLowerCase())
                        )}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => {
                            const isSelected = formSelectedOptions.includes(item.id);
                            return (
                                <TouchableOpacity
                                    onPress={() => toggleOption(item.id)}
                                    activeOpacity={0.7}
                                    className={`flex-row items-center py-4 px-6 border-b border-silver-100/50 ${isSelected ? 'bg-silver-50' : ''}`}
                                >
                                    <View className="flex-1">
                                        <Text className={`text-[16px] font-bold ${isSelected ? 'text-black' : 'text-black/80'} mb-0.5`}>{item.title}</Text>
                                        <Text className="text-[10px] font-medium text-brand-secondary uppercase tracking-widest">
                                            Group: {nodes.find(n => n.id === item.parentid)?.title || 'Uncategorized'}
                                        </Text>
                                    </View>
                                    <View className={`w-6 h-6 rounded-lg border items-center justify-center ${isSelected ? 'bg-black border-black' : 'border-silver-200 bg-white'}`}>
                                        {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        ListEmptyComponent={
                            <View className="items-center justify-center pt-20 px-12">
                                <Text className="text-sm font-medium text-brand-secondary text-center uppercase tracking-widest">No options found</Text>
                            </View>
                        }
                    />
                </View>
            </Modal>

        </View>
    );
}

