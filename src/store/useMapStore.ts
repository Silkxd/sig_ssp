import { create } from 'zustand';
import type { FeatureCollection } from 'geojson';

export interface LayerGroup {
    id: string;
    name: string;
    collapsed: boolean;
    visible: boolean; // Master toggle for the group
}

export interface MapLayer {
    id: string;
    groupId?: string | null; // Optional link to a group
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
    groups: LayerGroup[];

    // Layer Actions
    addLayer: (layer: MapLayer) => void;
    removeLayer: (id: string) => void;
    toggleLayerVisibility: (id: string) => void;
    setLayerOpacity: (id: string, opacity: number) => void;
    updateLayerColor: (id: string, color: string) => void;
    classifyLayer: (id: string, field: string) => void;
    setLayers: (layers: MapLayer[]) => void;
    moveLayerToGroup: (layerId: string, groupId: string | null) => void;

    // Group Actions
    setGroups: (groups: LayerGroup[]) => void;
    addGroup: (name: string) => void;
    removeGroup: (id: string) => void;
    toggleGroupCollapse: (id: string) => void;
    toggleGroupVisibility: (id: string) => void;

    // Map Control
    focusedLayerId: string | null;
    setFocusedLayer: (id: string | null) => void;
    focusedFeature: any | null;
    setFocusedFeature: (feature: any | null) => void;

    // Global Modal
    modal: {
        isOpen: boolean;
        type: 'alert' | 'confirm' | 'prompt';
        title: string;
        message: string;
        variant?: 'default' | 'danger';
        onConfirm?: (inputValue?: string) => void; // For confirm/prompt
        defaultValue?: string; // For prompt
    };
    openModal: (options: Omit<MapState['modal'], 'isOpen'>) => void;
    closeModal: () => void;
}

export const useMapStore = create<MapState>((set) => ({
    layers: [],
    groups: [],

    // Initial Modal State
    modal: { isOpen: false, type: 'alert', title: '', message: '' },

    // Groups
    setGroups: (groups) => set({ groups }),
    addGroup: (name) => set((state) => ({
        groups: [...state.groups, {
            id: crypto.randomUUID(),
            name,
            collapsed: false,
            visible: true
        }]
    })),
    removeGroup: (id) => set((state) => ({
        groups: state.groups.filter(g => g.id !== id),
        // Move layers out of the group
        layers: state.layers.map(l => l.groupId === id ? { ...l, groupId: null } : l)
    })),
    toggleGroupCollapse: (id) => set((state) => ({
        groups: state.groups.map(g => g.id === id ? { ...g, collapsed: !g.collapsed } : g)
    })),
    toggleGroupVisibility: (id) => set((state) => {
        const group = state.groups.find(g => g.id === id);
        if (!group) return state;
        const newVisible = !group.visible;

        return {
            groups: state.groups.map(g => g.id === id ? { ...g, visible: newVisible } : g),
            // Update all child layers
            layers: state.layers.map(l => l.groupId === id ? { ...l, visible: newVisible } : l)
        };
    }),
    moveLayerToGroup: (layerId, groupId) => set((state) => ({
        layers: state.layers.map(l => l.id === layerId ? { ...l, groupId } : l)
    })),

    // Layers
    addLayer: (layer) => set((state) => {
        if (state.layers.some(l => l.id === layer.id)) {
            return state;
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

                const uniqueValues = new Set<string>();
                l.data.features.forEach((f) => {
                    if (f.properties && f.properties[field]) {
                        uniqueValues.add(String(f.properties[field]));
                    }
                });

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
    // Map Control
    focusedLayerId: null,
    setFocusedLayer: (id) => set({ focusedLayerId: id }),
    focusedFeature: null,
    setFocusedFeature: (feature) => set({ focusedFeature: feature }),
    setLayers: (layers) => set({ layers }),

    // Global Modal
    openModal: (options) => set({ modal: { ...options, isOpen: true } }),
    closeModal: () => set((state) => ({ modal: { ...state.modal, isOpen: false } })),
}));
