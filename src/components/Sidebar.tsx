import React, { type ChangeEvent, useState, useEffect } from 'react';
import { useMapStore, type LayerGroup, type MapLayer } from '../store/useMapStore';
import { parseFile } from '../utils/geoParser';
import { FileService } from '../utils/FileService';
import { DbService } from '../utils/DbService';
import { FieldSelectionModal } from './FieldSelectionModal';
import { StyleOptionsModal } from './StyleOptionsModal';
import { ClassificationEditorModal } from './ClassificationEditorModal';
import { ExternalLayerModal } from './ExternalLayerModal';
import { LayerRow } from './LayerRow';
import { Layers, Eye, EyeOff, Trash2, Loader2, ZoomIn, FolderPlus, Folder, FolderOpen, ChevronRight, ChevronDown, FileUp, Database } from 'lucide-react';

export const Sidebar: React.FC = () => {
    const {
        layers, groups,
        addLayer, removeLayer, toggleLayerVisibility, setLayerOpacity, setFocusedLayer, updateLayerColor,
        setGroups,
        removeGroup, toggleGroupCollapse, toggleGroupVisibility, moveLayerToGroup,
        openModal
    } = useMapStore();

    const [loading, setLoading] = useState(false);

    // Modal & Editor States
    const [groupModalOpen, setGroupModalOpen] = useState(false);
    const [styleModalOpen, setStyleModalOpen] = useState(false);
    const [fieldModalOpen, setFieldModalOpen] = useState(false);
    const [selectedLayer, setSelectedLayer] = useState<MapLayer | null>(null);
    const [classificationFields, setClassificationFields] = useState<string[]>([]);

    // Classification Editor State
    const [classificationEditorOpen, setClassificationEditorOpen] = useState(false);
    const [editorPendingField, setEditorPendingField] = useState<string>('');
    const [editorValues, setEditorValues] = useState<string[]>([]);
    const [editorInitialMap, setEditorInitialMap] = useState<Record<string, string>>({});
    const [externalModalOpen, setExternalModalOpen] = useState(false);

    // Initial Load of Groups
    useEffect(() => {
        const loadGroups = async () => {
            try {
                const dbGroups = await DbService.getGroups();
                if (dbGroups) {
                    const mappedGroups: LayerGroup[] = dbGroups.map((g: any) => ({
                        id: g.id,
                        name: g.name,
                        collapsed: g.collapsed || false,
                        visible: g.visible ?? true
                    }));
                    setGroups(mappedGroups);
                }
            } catch (e) {
                console.error("Falha ao carregar grupos", e);
            }
        };
        loadGroups();
    }, []);

    // --- Helper to extract values ---
    const extractUniqueValues = (layer: MapLayer, field: string): string[] => {
        const uniqueValues = new Set<string>();
        layer.data.features.forEach((f) => {
            if (f.properties && f.properties[field] !== undefined && f.properties[field] !== null) {
                uniqueValues.add(String(f.properties[field]));
            }
        });
        return Array.from(uniqueValues).sort();
    };

    // --- Actions with Modals ---

    const openCreateGroupModal = () => {
        openModal({
            type: 'prompt',
            title: 'Novo Grupo',
            message: 'Digite um nome para o novo grupo de camadas.',
            defaultValue: '',
            onConfirm: async (name) => {
                if (!name || !name.trim()) return;
                setLoading(true);
                try {
                    const newGroup = await DbService.createGroup(name);
                    if (newGroup) {
                        setGroups([...groups, {
                            id: newGroup.id,
                            name: newGroup.name,
                            collapsed: false,
                            visible: true
                        }]);
                        openModal({ type: 'alert', title: 'Sucesso', message: 'Grupo criado com sucesso!', variant: 'default' });
                    }
                } catch (e) {
                    openModal({ type: 'alert', title: 'Erro', message: 'Erro ao criar grupo: ' + e, variant: 'danger' });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const confirmDeleteGroup = (groupId: string) => {
        openModal({
            type: 'confirm',
            title: 'Excluir Grupo',
            message: 'Tem certeza que deseja excluir este grupo? As camadas serão movidas para a raiz.',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await DbService.deleteGroup(groupId);
                    removeGroup(groupId);
                    openModal({ type: 'alert', title: 'Sucesso', message: 'Grupo excluído com sucesso!' });
                } catch (e) {
                    openModal({ type: 'alert', title: 'Erro', message: 'Erro ao excluir grupo: ' + e, variant: 'danger' });
                }
            }
        });
    };

    const confirmDeleteLayer = (layer: MapLayer) => {
        if (layer.type === 'database') {
            openModal({
                type: 'confirm',
                title: 'Excluir Camada',
                message: `Tem certeza que deseja excluir permanentemente a camada "${layer.name}" do banco de dados?`,
                variant: 'danger',
                onConfirm: async () => {
                    setLoading(true);
                    try {
                        await DbService.deleteLayer(layer.id);
                        removeLayer(layer.id);
                        openModal({ type: 'alert', title: 'Sucesso', message: 'Camada excluída com sucesso!' });
                    } catch (e) {
                        openModal({ type: 'alert', title: 'Erro', message: 'Falha ao excluir camada: ' + e, variant: 'danger' });
                    } finally {
                        setLoading(false);
                    }
                }
            });
        } else {
            openModal({
                type: 'confirm',
                title: 'Remover Camada',
                message: `Remover a camada "${layer.name}" do mapa?`,
                variant: 'danger',
                onConfirm: () => removeLayer(layer.id)
            });
        }
    };

    const confirmSaveLayer = (layer: MapLayer) => {
        if (layer.type === 'database') return;

        openModal({
            type: 'confirm',
            title: 'Salvar Camada',
            message: `Deseja salvar a camada "${layer.name}" no banco de dados para acesso permanente?`,
            onConfirm: async () => {
                setLoading(true);
                try {
                    await DbService.saveLayerToDatabase(layer.name, layer.data, {
                        savedAt: new Date().toISOString(),
                        originalId: layer.id,
                        style: layer.style, // Save current style
                        connectionConfig: layer.connectionConfig // Save connection config
                    }, layer.groupId);
                    openModal({ type: 'alert', title: 'Sucesso', message: 'Camada salva com sucesso!' });
                } catch (e) {
                    openModal({ type: 'alert', title: 'Erro', message: 'Falha ao salvar camada: ' + e, variant: 'danger' });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleMoveLayer = async (layerId: string, groupId: string | null) => {
        try {
            await DbService.updateLayerGroup(layerId, groupId);
            moveLayerToGroup(layerId, groupId);
        } catch (e) {
            openModal({ type: 'alert', title: 'Erro', message: 'Erro ao mover camada: ' + e, variant: 'danger' });
        }
    };

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

            // let matches = 0;
            if (layer.data && layer.data.features) {
                for (const feature of layer.data.features) {
                    if (feature.properties) {
                        const found = Object.values(feature.properties).some(val =>
                            String(val).toLowerCase().includes(query)
                        );

                        if (found) {
                            const nameProp = Object.keys(feature.properties).find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('nome')) || Object.keys(feature.properties)[0];
                            const displayName = feature.properties[nameProp] || 'Recurso Desconhecido';

                            results.push({
                                id: Math.random(),
                                layerName: layer.name,
                                feature: feature,
                                displayName: String(displayName)
                            });
                            // matches++;
                        }
                    }
                }
            }
        });

        setSearchResults(results);
    }, [searchQuery, layers]);

    // Classification & Style Logic
    // Classification & Style Logic
    // States moved to top of component
    const getRandomColor = () => {
        const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#d946ef'];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            // 1. Upload
            console.log('Enviando arquivo para Supabase...');
            const uploadResult = await FileService.uploadFile(file);

            if (uploadResult) {
                await FileService.saveMetadata(file.name, uploadResult.publicUrl, file.name.split('.').pop() || 'unknown', {
                    originalSize: file.size,
                    uploadDate: new Date().toISOString()
                });
            }

            // 2. Parse
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
            openModal({ type: 'alert', title: 'Erro', message: 'Erro ao processar arquivo: ' + error, variant: 'danger' });
        } finally {
            setLoading(false);
            if (event.target) event.target.value = '';
        }
    };

    const openStyleOptions = (layer: MapLayer) => {
        // If layer is already classified, open the Classification Editor directly
        if (layer.style?.type === 'categorized' && layer.style.field) {
            setSelectedLayer(layer);
            setEditorPendingField(layer.style.field);
            setEditorValues(extractUniqueValues(layer, layer.style.field));
            setEditorInitialMap(layer.style.classMap || {});
            // Check for initial border color
            // layer.style.borderColor might exist now
            // I need to set a state for initialBorderColor if I added it to Sidebar state?
            // Actually I can just pass it directly if I update the state object for editor props
            // Need to add state for initialBorderColor in Sidebar
            setClassificationEditorOpen(true);
        } else {
            // Otherwise open the standard style options (Simple / Border Only / or start new Classification)
            setSelectedLayer(layer);
            setStyleModalOpen(true);
        }
    };

    const handleClassifyLayer = (layer: MapLayer) => {
        let availableFields: string[] = [];
        if (layer.data.features.length > 0 && layer.data.features[0].properties) {
            availableFields = Object.keys(layer.data.features[0].properties);
        }
        setClassificationFields(availableFields);
        setFieldModalOpen(true);
    };

    const handleColorChange = async (color: string, weight: number) => {
        if (!selectedLayer) return;

        updateLayerColor(selectedLayer.id, color);

        const newStyle = {
            type: 'simple' as const,
            color: color,
            weight: weight
        };
        useMapStore.getState().setLayerStyle(selectedLayer.id, newStyle);

        if (selectedLayer.type === 'database') {
            try {
                await DbService.updateLayerStyle(selectedLayer.id, newStyle);
            } catch (e) {
                console.error("Failed to save color preference", e);
            }
        }
    };

    const handleBorderOnly = async (color: string, weight: number) => {
        if (!selectedLayer) return;

        setFocusedLayer(null);
        updateLayerColor(selectedLayer.id, color);

        const newStyle = {
            type: 'border-only' as const,
            color: color,
            weight: weight
        };

        useMapStore.getState().setLayerStyle(selectedLayer.id, newStyle);

        if (selectedLayer.type === 'database') {
            try {
                await DbService.updateLayerStyle(selectedLayer.id, newStyle);
            } catch (e) {
                console.error("Failed to save border-only preference", e);
            }
        }
    };

    return (
        <>
            <div className="h-full w-80 bg-white shadow-xl flex flex-col border-r border-slate-200 z-20">
                {/* Header */}
                <div className="p-4 bg-primary text-white shadow-md">
                    <h1 className="text-xl font-bold flex items-center gap-2"><Layers size={24} /> SIGWeb Manager</h1>
                    <p className="text-sm opacity-90 mt-1">Sistema de Informação Geográfica</p>
                    <div className="mt-4 relative">
                        <input
                            type="text" placeholder="Buscar locais..."
                            className="w-full pl-3 pr-8 py-1.5 text-sm text-slate-800 bg-white/90 rounded focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors placeholder:text-slate-400"
                            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery ? (
                            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1.5 text-slate-500 hover:text-slate-700"><Trash2 size={14} className="rotate-45" /></button>
                        ) : (<ZoomIn size={14} className="absolute right-2 top-1.5 text-slate-400" />)}
                    </div>
                </div>

                {/* Search Results */}
                {searchQuery && (
                    <div className="flex-1 overflow-y-auto bg-slate-50 p-2 border-b border-slate-200 min-h-[100px] max-h-[300px]">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2 px-1">Resultados da Busca ({searchResults.length})</h3>
                        {searchResults.length === 0 ? <div className="text-sm text-slate-400 px-2">Nenhum resultado encontrado.</div> : (
                            <div className="space-y-1">
                                {searchResults.map((res) => (
                                    <button key={res.id} onClick={() => setFocusedFeature(res.feature)} className="w-full text-left p-2 bg-white rounded border border-slate-200 hover:border-blue-400 hover:shadow-sm transition-all group">
                                        <div className="font-medium text-sm text-slate-700 group-hover:text-blue-600 truncate">{res.displayName}</div>
                                        <div className="text-[10px] text-slate-400 flex items-center gap-1"><Layers size={10} />{res.layerName}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tree View Control List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Recursos</h2>
                        <button
                            onClick={openCreateGroupModal}
                            className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                        >
                            <FolderPlus size={14} /> Novo Grupo
                        </button>
                    </div>

                    {layers.length === 0 && groups.length === 0 && (
                        <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                            <Layers className="mx-auto mb-2 opacity-50" size={32} />
                            <p>Sem camadas ou grupos</p>
                            <label className="mt-4 inline-block px-4 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                                {loading && <Loader2 className="animate-spin inline mr-2" size={16} />}
                                Importar Arquivo
                                <input type="file" className="hidden" accept=".geojson,.json,.kml,.kmz,.zip" onChange={handleFileUpload} />
                            </label>

                            <button
                                onClick={() => setExternalModalOpen(true)}
                                className="w-full mt-2 py-2 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 flex items-center justify-center gap-2 transition-colors shadow-sm"
                            >
                                <Database size={16} />
                                Conectar Banco Externo
                            </button>
                        </div>
                    )}

                    {layers.length > 0 && (
                        <div className="mb-4">
                            <label className="flex items-center gap-2 w-full p-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer transition-colors dashed">
                                {loading ? <Loader2 className="animate-spin" size={16} /> : <FileUp size={16} />}
                                <span>Importar nova camada...</span>
                                <input type="file" className="hidden" accept=".geojson,.json,.kml,.kmz,.zip" onChange={handleFileUpload} />
                            </label>

                            <button
                                onClick={() => setExternalModalOpen(true)}
                                className="w-full mt-2 py-2 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 flex items-center justify-center gap-2 transition-colors shadow-sm"
                            >
                                <Database size={16} />
                                Conectar Banco Externo
                            </button>
                        </div>
                    )}

                    {/* Groups */}
                    {groups.map(group => {
                        const groupLayers = layers.filter(l => l.groupId === group.id);
                        return (
                            <div key={group.id} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                                <div className="flex items-center justify-between p-2 bg-slate-100 border-b border-slate-200">
                                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleGroupCollapse(group.id)}>
                                        {group.collapsed ? <ChevronRight size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                                        {group.collapsed ? <Folder size={16} className="text-yellow-500" /> : <FolderOpen size={16} className="text-yellow-500" />}
                                        <span className="font-medium text-sm text-slate-700">{group.name}</span>
                                        <span className="text-[10px] text-slate-400 bg-slate-200 px-1.5 rounded-full">{groupLayers.length}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => toggleGroupVisibility(group.id)} className="p-1 hover:text-slate-800">
                                            {group.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                                        </button>
                                        <button onClick={() => confirmDeleteGroup(group.id)} className="p-1 hover:text-red-600">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {!group.collapsed && (
                                    <div className="p-2 space-y-2 bg-slate-50/50 min-h-[10px]">
                                        {groupLayers.length === 0 && <div className="text-[10px] text-slate-400 italic pl-6">Grupo vazio</div>}
                                        {groupLayers.map(layer => (
                                            <LayerRow
                                                key={layer.id}
                                                layer={layer}
                                                groups={groups}
                                                onFocus={setFocusedLayer}
                                                onToggleVisibility={toggleLayerVisibility}
                                                onSetOpacity={setLayerOpacity}
                                                onRemove={confirmDeleteLayer}
                                                onSave={confirmSaveLayer}
                                                onClassifyOrColor={openStyleOptions}
                                                onMove={handleMoveLayer}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Root Layers */}
                    {layers.filter(l => !l.groupId).map(layer => (
                        <LayerRow
                            key={layer.id}
                            layer={layer}
                            groups={groups}
                            onFocus={setFocusedLayer}
                            onToggleVisibility={toggleLayerVisibility}
                            onSetOpacity={setLayerOpacity}
                            onRemove={confirmDeleteLayer}
                            onSave={confirmSaveLayer}
                            onClassifyOrColor={openStyleOptions}
                            onMove={handleMoveLayer}
                        />
                    ))}
                </div >

                <div className="text-[10px] text-center text-slate-400 p-2 border-t border-slate-100">
                    <button onClick={async () => {
                        if (confirm('Limpar cache e recarregar?')) {
                            const { CacheService } = await import('../utils/CacheService');
                            await CacheService.clear();
                            window.location.reload();
                        }
                    }} className="hover:text-red-500 transition-colors">Limpar Cache</button>
                </div>
            </div >

            <StyleOptionsModal
                isOpen={styleModalOpen}
                onClose={() => setStyleModalOpen(false)}
                currentWeight={selectedLayer?.style?.weight}
                onSelectColor={handleColorChange}
                onSelectBorderOnly={handleBorderOnly}
                onSelectClassify={() => {
                    if (selectedLayer) handleClassifyLayer(selectedLayer);
                }}
            />

            <FieldSelectionModal
                isOpen={fieldModalOpen}
                onClose={() => setFieldModalOpen(false)}
                onSelect={(field) => {
                    if (selectedLayer) {
                        const values = extractUniqueValues(selectedLayer, field);
                        setEditorPendingField(field);
                        setEditorValues(values);

                        // Pre-fill if editing existing classification on same field
                        let initialMap = {};
                        if (selectedLayer.style?.type === 'categorized' && selectedLayer.style.field === field && selectedLayer.style.classMap) {
                            initialMap = selectedLayer.style.classMap;
                        }
                        setEditorInitialMap(initialMap);

                        setFieldModalOpen(false);
                        setClassificationEditorOpen(true);
                    }
                }}
                fields={classificationFields}
                layerName={selectedLayer?.name || ''}
            />

            <ClassificationEditorModal
                isOpen={classificationEditorOpen}
                onClose={() => setClassificationEditorOpen(false)}
                onSave={async (classMap, weight, borderColor) => {
                    if (selectedLayer && editorPendingField) {
                        const newStyle = {
                            type: 'categorized' as const,
                            field: editorPendingField,
                            classMap,
                            weight,
                            borderColor
                        };

                        useMapStore.getState().setLayerStyle(selectedLayer.id, newStyle);

                        if (selectedLayer.type === 'database') {
                            try {
                                await DbService.updateLayerStyle(selectedLayer.id, newStyle);
                            } catch (e) {
                                console.error("Failed to save classification", e);
                            }
                        }
                    }
                }}
                onReset={() => {
                    setClassificationEditorOpen(false);
                    if (selectedLayer) {
                        // Open standard options to allow switching back
                        setStyleModalOpen(true);
                    }
                }}
                field={editorPendingField}
                uniqueValues={editorValues}
                initialClassMap={editorInitialMap}
                initialBorderColor={selectedLayer?.style?.borderColor}
                layerName={selectedLayer?.name || ''}
            />
            <ExternalLayerModal
                isOpen={externalModalOpen}
                onClose={() => setExternalModalOpen(false)}
            />
        </>
    );
};

