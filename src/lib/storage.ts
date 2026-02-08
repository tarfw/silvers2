import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

const WORKER_URL = process.env.EXPO_PUBLIC_S3_WORKER_URL || '';

export interface UploadResult {
    key: string;
    publicUrl: string;
}

/**
 * Utility for handling image uploads via the secure Cloudflare Worker proxy to Sevalla.
 */
export const storage = {
    /**
     * Request a presigned PUT URL and the final Public URL from the Cloudflare Worker.
     */
    async getUploadUrl(fileName: string): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
        if (!WORKER_URL) {
            throw new Error('Cloudflare Worker URL not configured. Set EXPO_PUBLIC_S3_WORKER_URL.');
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('User not authenticated');

        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ method: 'PUT', fileName }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Worker error: ${error}`);
        }

        return await response.json();
    },

    /**
     * Pick an image from the device and upload it.
     */
    async uploadImage(): Promise<UploadResult | null> {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            throw new Error('Permission to access camera roll is required!');
        }

        const pickerResult = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (pickerResult.canceled) {
            return null;
        }

        const asset = pickerResult.assets[0];
        const fileName = asset.fileName || `image_${Date.now()}.jpg`;

        // 1. Get signed PUT URL and the final Public URL
        const { uploadUrl, publicUrl, key } = await this.getUploadUrl(fileName);

        // 2. Fetch the file data
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        // 3. Upload directly to Sevalla (R2)
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            body: blob,
            headers: {
                'Content-Type': 'image/jpeg',
            },
        });

        if (!uploadResponse.ok) {
            throw new Error('Failed to upload image to storage');
        }

        return { key, publicUrl };
    },

    /**
     * Get a viewable URL for a given key.
     * Currently returns the public URL by prepending the prefix.
     */
    async getViewUrl(key: string): Promise<string> {
        const PUBLIC_PREFIX = 'https://tstore81-wrmez.sevalla.storage';
        if (key.startsWith('http')) return key;
        return `${PUBLIC_PREFIX}/${key.replace(/^\//, '')}`;
    },
};
