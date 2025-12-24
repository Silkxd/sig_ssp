import { supabase } from '../lib/supabase';

export interface UploadResult {
    path: string;
    publicUrl: string;
}

export const FileService = {
    /**
     * Uploads a file to the 'raw_files' bucket.
     * @param file The file object to upload.
     * @returns An object containing the storage path and public URL, or null if failed.
     */
    async uploadFile(file: File): Promise<UploadResult | null> {
        try {
            const timestamp = Date.now();
            // Sanitize filename to avoid special characters issues
            const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const filePath = `${timestamp}_${cleanFileName}`;

            const { error } = await supabase.storage
                .from('raw_files')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Error uploading file to Supabase Storage:', error);
                throw error;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('raw_files')
                .getPublicUrl(filePath);

            return { path: filePath, publicUrl };
        } catch (error) {
            console.error('Upload failed:', error);
            return null;
        }
    },

    /**
     * Saves file metadata to the 'spatial_uploads' table.
     */
    async saveMetadata(filename: string, fileUrl: string, fileType: string, metadata: Record<string, any> = {}) {
        try {
            const { data, error } = await supabase
                .from('spatial_uploads')
                .insert({
                    filename,
                    file_url: fileUrl,
                    file_type: fileType,
                    metadata
                })
                .select()
                .single();

            if (error) {
                console.error('Error saving metadata to database:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Metadata save failed:', error);
            return null;
        }
    }
};
