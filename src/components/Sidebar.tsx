import React, { type ChangeEvent, useState, useEffect } from 'react';
import { useMapStore, type MapLayer } from '../store/useMapStore';
import { parseFile } from '../utils/geoParser';
import { FileService } from '../utils/FileService';
import { DbService } from '../utils/DbService';
import { FieldSelectionModal } from './FieldSelectionModal';
import { Layers, Eye, EyeOff, Trash2, Upload, Loader2, ZoomIn, Save, Palette } from 'lucide-react';
import clsx from 'clsx';

export const Sidebar: React.FC = () => {
    const { layers, addLayer, removeLayer, toggleLayerVisibility, setLayerOpacity, setFocusedLayer } = useMapStore();
    const [loading, setLoading] = useState(false);

    // Search Logic
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const { setFocusedFeature } = useMapStore();

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const query = searchQuery.toLowerCase();
        const results: any[] = [];

        layers.forEach(layer => {
            if (!layer.visible) return;

            // Limit results per layer to avoid freezing
            let matches = 0;
            if (layer.data && layer.data.features) {
                for (const feature of layer.data.features) {
                    // if (matches > 5) break; // Removed limit as requested

                    if (feature.properties) {
                        // Search in all string properties
                        const found = Object.values(feature.properties).some(val =>
                            String(val).toLowerCase().includes(query)
                        );

                        if (found) {
                            // Try to find a good display name
                            const nameProp = Object.keys(feature.properties).find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('nome')) || Object.keys(feature.properties)[0];
                            const displayName = feature.properties[nameProp] || 'Unknown Feature';

                            results.push({
                                id: Math.random(), // Simple ID for list
                                layerName: layer.name,
                                feature: feature,
                                displayName: String(displayName)
                            });
                            matches++;
                        }
                    }
                }
            }
        });

        setSearchResults(results);
    }, [searchQuery, layers]);

    // Classification Logic
    const [fieldModalOpen, setFieldModalOpen] = useState(false);
    const [selectedLayerForClassification, setSelectedLayerForClassification] = useState<MapLayer | null>(null);
    const [classificationFields, setClassificationFields] = useState<string[]>([]);

    const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            // 1. Upload to Supabase Storage
            console.log('Uploading file to Supabase...');
            const uploadResult = await FileService.uploadFile(file);

            if (uploadResult) {
                console.log('File uploaded:', uploadResult.publicUrl);

                // 2. Save Metadata to DB
                await FileService.saveMetadata(file.name, uploadResult.publicUrl, file.name.split('.').pop() || 'unknown', {
                    originalSize: file.size,
                    uploadDate: new Date().toISOString()
                });
            } else {
                console.warn('File upload failed, but continuing with local visualization.');
            }

            // 3. Parser for Client-Side Visualization
            const geojson = await parseFile(file);
            if (geojson) {
                const newLayer: MapLayer = {
                    id: crypto.randomUUID(),
                    name: file.name,
                    data: geojson,
                    visible: true,
                    opacity: 1,
                    color: getRandomColor(),
                    type: 'upload',
                };
                addLayer(newLayer);
            }
        } catch (error) {
            console.error(error);
            alert('Error processing file: ' + error);
        } finally {
            setLoading(false);
            // Reset input
            if (event.target) event.target.value = '';
        }
    };

    const getRandomColor = () => {
        const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#d946ef'];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    const handleSaveLayer = async (layer: MapLayer) => {
        if (layer.type === 'database') return;

        try {
            const confirmed = window.confirm(`Do you want to save layer "${layer.name}" to the database ? `);
            if (!confirmed) return;

            setLoading(true);
            await DbService.saveLayerToDatabase(layer.name, layer.data, {
                savedAt: new Date().toISOString(),
                originalId: layer.id
            });
            alert('Layer saved successfully!');
            // TODO: Update layer type to 'database' to disable save button?
        } catch (error) {
            console.error(error);
            alert('Failed to save layer: ' + error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveLayer = async (layer: MapLayer) => {
        if (layer.type === 'database') {
            const confirmed = window.confirm(`Are you sure you want to permanently delete layer "${layer.name}" from the database ? `);
            if (!confirmed) return;

            setLoading(true);
            try {
                await DbService.deleteLayer(layer.id);
                removeLayer(layer.id);
            } catch (error) {
                console.error(error);
                alert('Failed to delete layer: ' + error);
            } finally {
                setLoading(false);
            }
        } else {
            removeLayer(layer.id);
        }
    };

    const handleClassifyLayer = (layer: MapLayer) => {
        let availableFields: string[] = [];
        // Inspect first feature to get properties
        if (layer.data.features.length > 0 && layer.data.features[0].properties) {
            availableFields = Object.keys(layer.data.features[0].properties);
        }

        setClassificationFields(availableFields);
        setSelectedLayerForClassification(layer);
        setFieldModalOpen(true);
    };

    return (
        <div className="h-full w-80 bg-white shadow-xl flex flex-col border-r border-slate-200 z-20">
            <div className="p-4 bg-primary text-white shadow-md">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <Layers size={24} />
                    SIGWeb Manager
                </h1>
                <p className="text-sm opacity-90 mt-1">Geographic Information System</p>

                {/* Search Input */}
                <div className="mt-4 relative">
                    <input
                        type="text"
                        placeholder="Search places..."
                        className="w-full pl-3 pr-8 py-1.5 text-sm text-slate-800 bg-white/90 rounded focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors placeholder:text-slate-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery ? (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1.5 text-slate-500 hover:text-slate-700"
                        >
                            <Trash2 size={14} className="rotate-45" />
                        </button>
                    ) : (
                        <ZoomIn size={14} className="absolute right-2 top-1.5 text-slate-400" />
                    )}
                </div>
            </div>

            {/* Search Results Area - Overlays the layer list if active */}
            {searchQuery && (
                <div className="flex-1 overflow-y-auto bg-slate-50 p-2 border-b border-slate-200 min-h-[100px] max-h-[300px]">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2 px-1">
                        Search Results ({searchResults.length})
                    </h3>
                    {searchResults.length === 0 ? (
                        <div className="text-sm text-slate-400 px-2">No matches found.</div>
                    ) : (
                        <div className="space-y-1">
                            {searchResults.map((res) => (
                                <button
                                    key={res.id}
                                    onClick={() => {
                                        setFocusedFeature(res.feature);
                                    }}
                                    className="w-full text-left p-2 bg-white rounded border border-slate-200 hover:border-blue-400 hover:shadow-sm transition-all group"
                                >
                                    <div className="font-medium text-sm text-slate-700 group-hover:text-blue-600 truncate">
                                        {res.displayName}
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                        <Layers size={10} />
                                        {res.layerName}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Layer Control List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">My Layers</h2>

                {layers.length === 0 && (
                    <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                        <Layers className="mx-auto mb-2 opacity-50" size={32} />
                        <p>No layers added</p>
                    </div>
                )}

                {layers.map((layer) => (
                    <div key={layer.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: layer.color }}></div>
                                <span className="font-medium text-slate-700 truncate" title={layer.name}>{layer.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setFocusedLayer(layer.id)}
                                    className="p-1.5 text-slate-500 hover:text-primary hover:bg-blue-50 rounded-md transition-colors"
                                    title="Zoom to Layer"
                                >
                                    <ZoomIn size={16} />
                                </button>

                                <button
                                    onClick={() => handleClassifyLayer(layer)}
                                    className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                                    title="Classify Layer"
                                >
                                    <Palette size={16} />
                                </button>

                                {layer.type === 'upload' && (
                                    <button
                                        onClick={() => handleSaveLayer(layer)}
                                        className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                                        title="Save to Database"
                                    >
                                        <Save size={16} />
                                    </button>
                                )}

                                <button
                                    onClick={() => toggleLayerVisibility(layer.id)}
                                    className="p-1.5 text-slate-500 hover:text-primary hover:bg-blue-50 rounded-md transition-colors"
                                    title={layer.visible ? "Hide Layer" : "Show Layer"}
                                >
                                    {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                                <button
                                    onClick={() => handleRemoveLayer(layer)}
                                    className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                    title="Remove Layer"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Controls */}
                        {layer.visible && (
                            <div className="mt-2 text-xs text-slate-500">
                                <div className="flex items-center gap-2">
                                    <span>Opacity</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={layer.opacity}
                                        onChange={(e) => setLayerOpacity(layer.id, parseFloat(e.target.value))}
                                        className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200">
                <label className="block w-full">
                    <span className="sr-only">Choose file</span>
                    <div className={clsx(
                        "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors",
                        loading ? "bg-slate-200 cursor-not-allowed" : "bg-primary hover:bg-primary-light text-white shadow-md"
                    )}>
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                        <span className="font-medium">Import Spatial Data</span>
                    </div>
                    <input
                        type="file"
                        className="hidden"
                        accept=".kml,.zip,.json,.geojson"
                        onChange={handleFileUpload}
                        disabled={loading}
                    />
                </label>

                <p className="text-xs text-center text-slate-400 mt-2">
                    Supports: Shapefile (.zip), KML, GeoJSON
                </p>

                {/* TODO: Save Button */}
                {/* <button className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors">
            <Database size={18} />
            Save to Database
        </button> */}
            </div>

            {/* Modals */}
            <FieldSelectionModal
                isOpen={fieldModalOpen}
                onClose={() => setFieldModalOpen(false)}
                onSelect={(field) => {
                    if (selectedLayerForClassification) {
                        useMapStore.getState().classifyLayer(selectedLayerForClassification.id, field);
                        setFieldModalOpen(false);
                    }
                }}
                fields={classificationFields}
                layerName={selectedLayerForClassification?.name || ''}
            />

            <div className="absolute bottom-1 left-1 opacity-50 hover:opacity-100 transition-opacity">
                <button
                    onClick={async () => {
                        if (confirm('Clear local cache and reload?')) {
                            const { CacheService } = await import('../utils/CacheService');
                            await CacheService.clear();
                            window.location.reload();
                        }
                    }}
                    className="text-[10px] text-slate-400 hover:text-slate-600 px-2 py-1"
                >
                    Clear Cache
                </button>
            </div>
        </div>
    );
};
