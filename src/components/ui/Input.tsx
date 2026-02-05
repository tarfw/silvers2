import React from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    icon,
    containerClassName = '',
    ...props
}) => {
    return (
        <View className={`mb-4 ${containerClassName}`}>
            {label && <Text className="text-sm font-medium text-brand-secondary mb-1.5 ml-1">{label}</Text>}
            <View className={`flex-row items-center bg-silver-50 border ${error ? 'border-red-500' : 'border-silver-200'} rounded-2xl px-4 h-12`}>
                {icon && <Ionicons name={icon} size={20} color="#636366" className="mr-2" />}
                <TextInput
                    className="flex-1 text-brand-primary text-base"
                    placeholderTextColor="#AEAEB2"
                    {...props}
                />
            </View>
            {error && <Text className="text-xs text-red-500 mt-1 ml-1">{error}</Text>}
        </View>
    );
};
