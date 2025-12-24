import { supabase } from '../lib/supabase';
import type { FeatureCollection } from 'geojson';
import { CacheService } from './CacheService';

export const DbService = {
    /**
     * Saves a GeoJSON FeatureCollection to the database.
     * Creates a 'collection' record and then inserts 'features'.
     */
    async saveLayerToDatabase(name: string, geojson: FeatureCollection, metadata: any = {}) {
        try {
            // 1. Create Collection
            const { data: collection, error: collectionError } = await supabase
                .from('collections')
                .insert({
                    name,
                    metadata,
                })
                .select()
                .single();

            if (collectionError) throw collectionError;

            // 2. Prepare Features
            const features = geojson.features.map((feature) => ({
                collection_id: collection.id,
                geom: feature.geometry,
                properties: feature.properties,
            }));

            // 3. Insert Features (Batch)
            // Note: Supabase might have a limit on request size. 
            // For large files, we might need chunking. 
            const { error: featuresError } = await supabase
                .from('features')
                .insert(features);

            if (featuresError) throw featuresError;

            // Cache the new layer immediately
            await CacheService.set(collection.id, {
                id: collection.id,
                name: collection.name,
                data: geojson,
                visible: true,
                opacity: 1,
                color: '#3b82f6',
                type: 'database',
                style: metadata?.style
            });

            return collection;
        } catch (error) {
            console.error('Error saving layer to database:', error);
            throw error;
        }
    },

    /**
     * Fetches all saved layers (collections + features) from the database.
     * Optimized with Parallel Fetching + Client-Side Caching (IndexedDB).
     */
    async getSavedLayers() {
        try {
            // 1. Fetch Collections List (Lightweight)
            const { data: collections, error: collectionsError } = await supabase
                .from('collections')
                .select('*')
                .order('created_at', { ascending: false });

            if (collectionsError) throw collectionsError;

            // 2. Parallel Processing for each collection
            const layerPromises = collections.map(async (col) => {
                // A. Check Cache First
                try {
                    const cachedLayer = await CacheService.get(col.id);
                    // Verify cache integrity (e.g., check if cached style matches DB style)
                    if (cachedLayer) {
                        // Optional: Compare metadata timestamps if implemented, for now assume cache is good unless style changed
                        // Simple sync check: Ensure cached style matches current DB metadata style
                        if (JSON.stringify(cachedLayer.style) === JSON.stringify(col.metadata?.style)) {
                            return { ...cachedLayer, visible: true }; // Return cached version
                        }
                        // If logic differs (e.g. style updated by another user), we might want to re-fetch or just update style.
                        // For simplicity/robustness: If simple check fails, or just always update style:
                        return { ...cachedLayer, style: col.metadata?.style, visible: true };
                    }
                } catch (e) {
                    console.warn('Cache read error, falling back to network', e);
                }

                // B. Fallback: Fetch Features from Network
                const { data: features, error: featuresError } = await supabase
                    .from('features')
                    .select('geom, properties')
                    .eq('collection_id', col.id);

                if (featuresError) {
                    console.error(`Error fetching features for collection ${col.id}:`, featuresError);
                    return null;
                }

                // Reconstruct GeoJSON
                const geojson: FeatureCollection = {
                    type: 'FeatureCollection',
                    features: features.map((f: any) => ({
                        type: 'Feature',
                        geometry: f.geom,
                        properties: f.properties,
                    })),
                };

                const newLayer = {
                    id: col.id,
                    name: col.name,
                    data: geojson,
                    visible: true,
                    opacity: 1,
                    color: '#3b82f6',
                    type: 'database',
                    style: col.metadata?.style
                };

                // C. Update Cache
                await CacheService.set(col.id, newLayer);

                return newLayer;
            });

            const layers = (await Promise.all(layerPromises)).filter(Boolean);
            return layers;
        } catch (error) {
            console.error('Error fetching saved layers:', error);
            return [];
        }
    },

    /**
     * Deletes a layer (collection) from the database.
     * Features should be automatically deleted via Cascade.
     */
    async deleteLayer(collectionId: string) {
        try {
            const { error } = await supabase
                .from('collections')
                .delete()
                .eq('id', collectionId);

            if (error) throw error;

            // Remove from Cache
            await CacheService.remove(collectionId);

            return true;
        } catch (error) {
            console.error('Error deleting layer:', error);
            throw error;
        }
    },

    /**
     * Updates the metadata of a layer (collection).
     * Used for saving style configurations.
     */
    async updateLayerStyle(collectionId: string, style: any) {
        try {
            // First fetch current metadata to merge
            const { data: current, error: fetchError } = await supabase
                .from('collections')
                .select('metadata')
                .eq('id', collectionId)
                .single();

            if (fetchError) throw fetchError;

            const newMetadata = {
                ...current.metadata,
                style
            };

            const { error: updateError } = await supabase
                .from('collections')
                .update({ metadata: newMetadata })
                .eq('id', collectionId);

            if (updateError) throw updateError;

            // Update Cache with new style (without re-fetching all features)
            const cachedLayer = await CacheService.get(collectionId);
            if (cachedLayer) {
                await CacheService.set(collectionId, { ...cachedLayer, style });
            }

            return true;
        } catch (error) {
            console.error('Error updating layer style:', error);
            throw error;
        }
    }
};
