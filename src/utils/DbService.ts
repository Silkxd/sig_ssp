import { supabase } from '../lib/supabase';
import type { FeatureCollection } from 'geojson';
import { CacheService } from './CacheService';

export const DbService = {
    /**
     * Saves a GeoJSON FeatureCollection to the database.
     * Creates a 'collection' record and then inserts 'features'.
     */
    async saveLayerToDatabase(name: string, geojson: FeatureCollection, metadata: any = {}, groupId: string | null = null) {
        try {
            // 1. Create Collection
            const { data: collection, error: collectionError } = await supabase
                .from('collections')
                .insert({
                    name,
                    metadata,
                    group_id: groupId
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
            const { error: featuresError } = await supabase
                .from('features')
                .insert(features);

            if (featuresError) throw featuresError;

            // Cache the new layer immediately
            await CacheService.set(collection.id, {
                id: collection.id,
                groupId: groupId,
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
            console.error('Erro ao salvar camada no banco de dados:', error);
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
                        // CRITICAL FIX: Always update groupId from the fresh DB collection record
                        // because the cache might be stale or from before grouping was implemented.
                        const updatedLayer = {
                            ...cachedLayer,
                            groupId: col.group_id // Force update from DB
                        };

                        // Simple sync check: Ensure cached style matches current DB metadata style
                        if (JSON.stringify(cachedLayer.style) === JSON.stringify(col.metadata?.style)) {
                            return { ...updatedLayer, visible: true };
                        }

                        return { ...updatedLayer, style: col.metadata?.style, visible: true };
                    }
                } catch (e) {
                    console.warn('Erro de leitura do cache, voltando para a rede', e);
                }

                // B. Fallback: Fetch Features from Network
                const { data: features, error: featuresError } = await supabase
                    .from('features')
                    .select('geom, properties')
                    .eq('collection_id', col.id);

                if (featuresError) {
                    console.error(`Erro ao buscar feições para a coleção ${col.id}:`, featuresError);
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
                    groupId: col.group_id, // Load group association
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
            console.error('Erro ao buscar camadas salvas:', error);
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
            console.error('Erro ao excluir camada:', error);
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
            console.error('Erro ao atualizar estilo da camada:', error);
            throw error;
        }
    },

    // --- Group Persistence Methods ---

    async getGroups() {
        const { data, error } = await supabase
            .from('layer_groups')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Erro ao buscar grupos:', error);
            return [];
        }
        return data || [];
    },

    async createGroup(name: string) {
        const { data, error } = await supabase
            .from('layer_groups')
            .insert({ name })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteGroup(groupId: string) {
        const { error } = await supabase
            .from('layer_groups')
            .delete()
            .eq('id', groupId);

        if (error) throw error;
    },

    async updateLayerGroup(layerId: string, groupId: string | null) {
        const { error } = await supabase
            .from('collections')
            .update({ group_id: groupId })
            .eq('id', layerId);

        if (error) throw error;
    }
};
