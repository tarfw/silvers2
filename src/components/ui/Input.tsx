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
    const isMultiline = props.multiline;

    const wrapperClass = React.useMemo(() => {
        const hasBorder = className.includes('border');
        const hasHeight = className.includes('h-');

        return [
            'flex-row',
            'bg-white',
            'px-4',
            error ? 'border border-red-500' : (hasBorder ? '' : 'border-b border-silver-200'),
            isMultiline ? 'items-start pt-4' : 'items-center',
            hasHeight ? '' : 'h-16',
            className
        ].filter(Boolean).join(' ');
    }, [className, error, isMultiline]);

    return (
        <View className={`mb-6 ${containerClassName}`}>
            {label && <Text className="text-[11px] font-black text-brand-secondary uppercase tracking-[1.5px] mb-3 ml-1">{label}</Text>}
            <View className={wrapperClass}>
                {icon && <Ionicons name={icon} size={20} color="#000" style={{ marginRight: 12, marginTop: isMultiline ? 4 : 0 }} />}
                <TextInput
                    className="flex-1 text-black text-[16px] font-medium"
                    placeholderTextColor="#AEAEB2"
                    textAlignVertical={isMultiline ? 'top' : 'center'}
                    autoCorrect={false}
                    spellCheck={false}
                    {...props}
                />
            </View>
            {error && <Text className="text-xs text-red-500 mt-2 ml-1">{error}</Text>}
        </View>
    );
};
