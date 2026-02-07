import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Keyboard, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { generateShortId } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

export function AddAddressScreen() {
    const { user, db } = useAuth();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();
    const targetActorId = route.params?.targetActorId || user?.id;
    const editingAddress = route.params?.editingAddress;

    const [newAddress, setNewAddress] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [newPincode, setNewPincode] = useState('');
    const [newState, setNewState] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [addressType, setAddressType] = useState<'individual' | 'business'>('business');
    const [gstNumber, setGstNumber] = useState('');
    const [isSelectingState, setIsSelectingState] = useState(false);

    useEffect(() => {
        if (editingAddress) {
            setNewAddress(editingAddress.text || '');
            setBusinessName(editingAddress.businessName || '');
            setNewPincode(editingAddress.pincode || '');
            setNewState(editingAddress.state || '');
            setNewPhone(editingAddress.phone || '');
            setAddressType(editingAddress.type || 'business');
            setGstNumber(editingAddress.gst || '');
        }
    }, [editingAddress]);

    const handleSaveAddress = async () => {
        if (!db || !targetActorId) return;

        if (!newAddress.trim()) {
            Alert.alert('Error', 'Please enter an address');
            return;
        }

        if (!newPhone.trim() || newPhone.trim().length < 10) {
            Alert.alert('Error', 'Please enter a valid phone number');
            return;
        }

        if (addressType === 'business' && !businessName.trim()) {
            Alert.alert('Error', 'Please enter Business Name');
            return;
        }

        if (addressType === 'business' && !gstNumber.trim()) {
            Alert.alert('Error', 'GST Number is mandatory for business addresses');
            return;
        }

        try {
            const actorData = await db.all('SELECT metadata FROM actors WHERE id = ?', [targetActorId]) as any[];
            let addresses = [];
            let metadata = {};
            if (actorData?.[0]?.metadata) {
                metadata = JSON.parse(actorData[0].metadata);
                addresses = (metadata as any).addresses || [];
            }

            const updatedAddrObj = {
                id: editingAddress ? editingAddress.id : `addr_${generateShortId()}`,
                businessName: addressType === 'business' ? businessName.trim() : undefined,
                text: newAddress.trim(),
                pincode: newPincode.trim(),
                state: newState.trim(),
                phone: newPhone.trim(),
                type: addressType,
                gst: addressType === 'business' ? gstNumber.trim().toUpperCase() : undefined,
                isDefault: editingAddress ? editingAddress.isDefault : addresses.length === 0,
                lastUsed: new Date().toISOString()
            };

            let updatedHistory;
            if (editingAddress) {
                updatedHistory = addresses.map((addr: any) =>
                    addr.id === editingAddress.id ? updatedAddrObj : addr
                );
            } else {
                updatedHistory = [updatedAddrObj, ...addresses];
            }

            await db.run('UPDATE actors SET metadata = ? WHERE id = ?', [
                JSON.stringify({ ...metadata, addresses: updatedHistory }),
                targetActorId
            ]);

            navigation.goBack();
        } catch (error) {
            console.error('Error saving address:', error);
            Alert.alert('Error', 'Failed to save address');
        }
    };

    if (isSelectingState) {
        return (
            <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
                <View className="flex-row items-center px-6 pt-4 pb-5 border-b border-silver-100">
                    <TouchableOpacity onPress={() => setIsSelectingState(false)} className="mr-4">
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-black">Select State</Text>
                </View>

                <ScrollView
                    keyboardShouldPersistTaps="always"
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    {INDIAN_STATES.map((state) => (
                        <TouchableOpacity
                            key={state}
                            className="p-5 border-b border-silver-50 active:bg-silver-50"
                            onPress={() => {
                                setNewState(state);
                                setIsSelectingState(false);
                            }}
                        >
                            <Text className="text-[16px] text-black font-medium">{state}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <View className="flex-row items-center px-6 pt-4 pb-5">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-black">{editingAddress ? 'Edit Address' : 'New Address'}</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                <View className="gap-5 mt-2">
                    {/* Account Type Selector */}
                    <View className="flex-row bg-silver-50 p-1 mb-4 border border-silver-200">
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                paddingVertical: 10,
                                alignItems: 'center',
                                backgroundColor: addressType === 'business' ? '#FFFFFF' : 'transparent',
                                borderWidth: addressType === 'business' ? 1 : 0,
                                borderColor: '#E5E5E5'
                            }}
                            onPress={() => setAddressType('business')}
                        >
                            <Text className={`text-sm font-semibold ${addressType === 'business' ? 'text-black' : 'text-brand-secondary'}`}>Business</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                paddingVertical: 10,
                                alignItems: 'center',
                                backgroundColor: addressType === 'individual' ? '#FFFFFF' : 'transparent',
                                borderWidth: addressType === 'individual' ? 1 : 0,
                                borderColor: '#E5E5E5'
                            }}
                            onPress={() => setAddressType('individual')}
                        >
                            <Text className={`text-sm font-semibold ${addressType === 'individual' ? 'text-black' : 'text-brand-secondary'}`}>Individual</Text>
                        </TouchableOpacity>
                    </View>

                    {addressType === 'business' && (
                        <Input
                            label="Business Details"
                            value={businessName}
                            onChangeText={setBusinessName}
                            placeholder="Business Name (Required)"
                            containerClassName="mb-4"
                            className="border border-silver-200 bg-white"
                        />
                    )}

                    <Input
                        label={addressType === 'individual' ? "Mandatory Details" : undefined}
                        value={newAddress}
                        onChangeText={setNewAddress}
                        placeholder="Full Address (Street, Building, etc.)"
                        multiline
                        numberOfLines={3}
                        containerClassName="mb-4"
                        className="h-24 border border-silver-200 bg-white"
                        textAlignVertical="top"
                    />

                    <View className="flex-row gap-3">
                        <View className="flex-1 mb-6">
                            <View className="h-16 border border-silver-200 bg-white px-4 justify-center">
                                <TextInput
                                    value={newPincode}
                                    onChangeText={setNewPincode}
                                    placeholder="Pincode"
                                    placeholderTextColor="#AEAEB2"
                                    keyboardType="numeric"
                                    maxLength={6}
                                    style={{
                                        color: '#000000',
                                        fontSize: 16,
                                        fontWeight: '500',
                                        flex: 1
                                    }}
                                    autoCorrect={false}
                                    spellCheck={false}
                                />
                            </View>
                        </View>
                        <View className="flex-1 mb-4">
                            <TouchableOpacity
                                onPress={() => {
                                    Keyboard.dismiss();
                                    setIsSelectingState(true);
                                }}
                                className="h-16 border border-silver-200 bg-white justify-center px-4"
                            >
                                <Text className={`text-[16px] font-medium ${newState ? 'text-black' : 'text-[#AEAEB2]'}`}>
                                    {newState || 'Select State'}
                                </Text>
                                <View className="absolute right-4 top-5">
                                    <Ionicons name="caret-down" size={16} color="#AEAEB2" />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Input
                        value={newPhone}
                        onChangeText={setNewPhone}
                        placeholder="Phone Number (Required)"
                        keyboardType="phone-pad"
                        maxLength={10}
                        containerClassName="mb-4"
                        className="border border-silver-200 bg-white"
                    />

                    {
                        addressType === 'business' && (
                            <Input
                                label="Business Details"
                                value={gstNumber}
                                onChangeText={setGstNumber}
                                placeholder="GST Number (Mandatory)"
                                autoCapitalize="characters"
                                containerClassName="mb-4"
                                className="border border-silver-200 bg-white"
                            />
                        )
                    }

                    <View className="mt-4">
                        <Button
                            label="Save Address"
                            onPress={handleSaveAddress}
                            size="lg"
                            className="w-full"
                        />
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
