import React, { useState, useEffect } from 'react';
import { Image, ImageProps, ActivityIndicator, View, StyleSheet, TouchableOpacity } from 'react-native';
import { storage } from '../lib/storage';

interface SecureImageProps extends ImageProps {
    source: { uri: string } | any;
    fallbackComponent?: React.ReactNode;
    onPress?: (uri: string) => void;
}

/**
 * A wrapper around React Native Image that automatically signs S3 keys.
 * Handles both full URLs and relative storage paths.
 * No external dependencies required.
 */
export const SecureImage = ({ source, style, fallbackComponent, onPress, ...props }: SecureImageProps) => {
    const [uri, setUri] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const resolveUri = async () => {
            const originalUri = source?.uri;

            if (!originalUri) {
                setUri(null);
                return;
            }

            // If it's already a full URL, use it directly
            if (typeof originalUri === 'string' && originalUri.startsWith('http')) {
                setUri(originalUri);
                return;
            }

            // Otherwise, treat as a storage key (including those starting with 'uploads/')
            setIsLoading(true);
            try {
                const resolvedUrl = await storage.getViewUrl(originalUri);
                setUri(resolvedUrl);
            } catch (error) {
                console.error('Failed to resolve secure image:', error);
                setUri(null);
            } finally {
                setIsLoading(false);
            }
        };

        resolveUri();
    }, [source?.uri]);

    if (isLoading) {
        return (
            <View style={[styles.placeholder, style]}>
                <ActivityIndicator size="small" color="#636366" />
            </View>
        );
    }

    if (!uri) {
        return fallbackComponent ? <>{fallbackComponent}</> : <View style={[styles.placeholder, style]} />;
    }

    // Use regular Image if no onPress is needed. This avoids nested TouchableOpacity issues
    // and ensures simple styling (like width: '100%') works correctly.
    if (!onPress) {
        return <Image {...props} source={{ uri }} style={style} />;
    }

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => uri && onPress?.(uri)}
            style={style}
        >
            <Image {...props} source={{ uri }} style={[StyleSheet.absoluteFill, style]} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    placeholder: {
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
