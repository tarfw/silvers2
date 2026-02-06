import React from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    containerClassName?: string;
    className?: string;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    icon,
    containerClassName = '',
    className = '',
    ...props
}) => {
    return (
        <View className={`mb-6 ${containerClassName}`}>
            {label && <Text className="text-[11px] font-black text-brand-secondary uppercase tracking-[1.5px] mb-3 ml-1">{label}</Text>}
            <View className={`flex-row items-center bg-white border-b-2 ${error ? 'border-red-500' : 'border-silver-200'} h-16 px-4 ${className}`}>
                {icon && <Ionicons name={icon} size={20} color="#000" style={{ marginRight: 12 }} />}
                <TextInput
                    className="flex-1 text-black text-[16px] font-medium"
                    placeholderTextColor="#AEAEB2"
                    {...props}
                />
            </View>
            {error && <Text className="text-xs text-red-500 mt-2 ml-1">{error}</Text>}
        </View>
    );
};
