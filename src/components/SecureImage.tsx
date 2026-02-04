import React, { useState, useEffect } from 'react';
import { Image, ImageProps, ActivityIndicator, View, StyleSheet } from 'react-native';
import { storage } from '../lib/storage';

interface SecureImageProps extends ImageProps {
    source: { uri: string } | any;
    fallbackComponent?: React.ReactNode;
}

/**
 * A wrapper around React Native Image that automatically signs S3 keys.
 */
export const SecureImage = ({ source, style, fallbackComponent, ...props }: SecureImageProps) => {
    const [uri, setUri] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const resolveUri = async () => {
            const originalUri = source?.uri;

            if (!originalUri) {
                setUri(null);
                return;
            }

            // Check if it's an S3 key (starts with uploads/)
            if (originalUri.startsWith('uploads/')) {
                setIsLoading(true);
                try {
                    const signedUrl = await storage.getViewUrl(originalUri);
                    setUri(signedUrl);
                } catch (error) {
                    console.error('Failed to resolve secure image:', error);
                    setUri(null);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setUri(originalUri);
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

    return <Image {...props} source={{ uri }} style={style} />;
};

const styles = StyleSheet.create({
    placeholder: {
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
