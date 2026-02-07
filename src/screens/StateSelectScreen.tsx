import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

export function StateSelectScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();
    const returnTo = route.params?.returnTo || 'Addresses';

    const handleSelect = (state: string) => {
        // Navigate back with the selected state
        navigation.navigate({
            name: returnTo,
            params: { selectedState: state },
            merge: true,
        });
    };

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <View className="flex-row items-center px-6 pt-4 pb-5 border-b border-silver-100">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-black">Select State</Text>
            </View>

            <FlatList
                data={INDIAN_STATES}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        className="p-5 border-b border-silver-50 active:bg-silver-50"
                        onPress={() => handleSelect(item)}
                    >
                        <Text className="text-[16px] text-black font-medium">{item}</Text>
                    </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingBottom: 40 }}
                keyboardShouldPersistTaps="always"
            />
        </View>
    );
}
