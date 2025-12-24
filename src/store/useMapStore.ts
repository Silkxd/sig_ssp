import { create } from 'zustand';
import type { FeatureCollection } from 'geojson';

export interface MapLayer {
    id: string;
    name: string;
    data: FeatureCollection;
    visible: boolean;
    opacity: number;
    color: string;
    type: 'upload' | 'database';
    style?: {
        type: 'simple' | 'categorized';
        field?: string;
        classMap?: Record<string, string>;
    };
}

interface MapState {
    layers: MapLayer[];
    addLayer: (layer: MapLayer) => void;
    removeLayer: (id: string) => void;
    toggleLayerVisibility: (id: string) => void;
    setLayerOpacity: (id: string, opacity: number) => void;
    updateLayerColor: (id: string, color: string) => void;
    classifyLayer: (id: string, field: string) => void;
    setLayers: (layers: MapLayer[]) => void;
    focusedLayerId: string | null;
    setFocusedLayer: (id: string | null) => void;
    focusedFeature: any | null; // GeoJSON Feature
    setFocusedFeature: (feature: any | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
    layers: [],
    addLayer: (layer) => set((state) => {
        if (state.layers.some(l => l.id === layer.id)) {
            return state; // Duplicate, ignore
        }
        return { layers: [...state.layers, layer] };
    }),
    removeLayer: (id) => set((state) => ({ layers: state.layers.filter((l) => l.id !== id) })),
    toggleLayerVisibility: (id) =>
        set((state) => ({
            layers: state.layers.map((l) =>
                l.id === id ? { ...l, visible: !l.visible } : l
            ),
        })),
    setLayerOpacity: (id, opacity) =>
        set((state) => ({
            layers: state.layers.map((l) =>
                l.id === id ? { ...l, opacity } : l
            ),
        })),
    updateLayerColor: (id, color) =>
        set((state) => ({
            layers: state.layers.map((l) =>
                l.id === id ? { ...l, color } : l
            ),
        })),
    classifyLayer: (id, field) =>
        set((state) => ({
            layers: state.layers.map((l) => {
                if (l.id !== id) return l;

                // Extract unique values
                const uniqueValues = new Set<string>();
                l.data.features.forEach((f) => {
                    if (f.properties && f.properties[field]) {
                        uniqueValues.add(String(f.properties[field]));
                    }
                });

                // Generate colors
                const classMap: Record<string, string> = {};
                const colors = [
                    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
                    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
                    '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#881337'
                ];

                let i = 0;
                uniqueValues.forEach((val) => {
                    classMap[val] = colors[i % colors.length];
                    i++;
                });

                return {
                    ...l,
                    style: {
                        type: 'categorized',
                        field,
                        classMap
                    }
                };
            }),
        })),
    focusedLayerId: null,
    setFocusedLayer: (id) => set({ focusedLayerId: id }),
    focusedFeature: null,
    setFocusedFeature: (feature) => set({ focusedFeature: feature }),
    setLayers: (layers) => set({ layers }),
}));
