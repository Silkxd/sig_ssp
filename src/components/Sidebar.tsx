import React, { type ChangeEvent, useState, useEffect } from 'react';
import { useMapStore, type LayerGroup, type MapLayer } from '../store/useMapStore';
import { parseFile } from '../utils/geoParser';
import { FileService } from '../utils/FileService';
import { DbService } from '../utils/DbService';
import { FieldSelectionModal } from './FieldSelectionModal';
import { StyleOptionsModal } from './StyleOptionsModal';
import { LayerRow } from './LayerRow';
import { Layers, Eye, EyeOff, Trash2, Loader2, ZoomIn, FolderPlus, Folder, FolderOpen, ChevronRight, ChevronDown, FileUp } from 'lucide-react';

export const Sidebar: React.FC = () => {
    const {
        layers, groups,
        addLayer, removeLayer, toggleLayerVisibility, setLayerOpacity, setFocusedLayer, updateLayerColor,
        setGroups,
        removeGroup, toggleGroupCollapse, toggleGroupVisibility, moveLayerToGroup,
        openModal
    } = useMapStore();

    const [loading, setLoading] = useState(false);

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
                        originalId: layer.id
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
    const [fieldModalOpen, setFieldModalOpen] = useState(false);
    const [styleModalOpen, setStyleModalOpen] = useState(false);
    const [selectedLayer, setSelectedLayer] = useState<MapLayer | null>(null);
    const [classificationFields, setClassificationFields] = useState<string[]>([]);

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
        setSelectedLayer(layer);
        setStyleModalOpen(true);
    };

    const handleClassifyLayer = (layer: MapLayer) => {
        let availableFields: string[] = [];
        if (layer.data.features.length > 0 && layer.data.features[0].properties) {
            availableFields = Object.keys(layer.data.features[0].properties);
        }
        setClassificationFields(availableFields);
        setFieldModalOpen(true);
    };

    const handleColorChange = async (color: string) => {
        if (!selectedLayer) return;

        updateLayerColor(selectedLayer.id, color);

        if (selectedLayer.type === 'database') {
            try {
                // Fetch current style, update simple color (or revert to simple if it was categorized?)
                // Assuming we want to switch to simple style with this color
                const newStyle = {
                    type: 'simple',
                    color: color
                };
                // We don't have a direct 'updateColor' in DbService that just updates one field easily 
                // without touching style structure, handled via updateLayerStyle usually.
                // But wait, the layer COLOR property in the DB is not fully separate from style in our 
                // simplified logic? Actually DbService.updateLayerStyle updates the 'metadata.style' field.
                // Our Store has 'color' property on the layer object, but also 'style' object.
                // Let's decide: Simple color change updates the layer.color on the map AND 
                // saves it as a 'simple' style preference in DB so next load it persists.

                await DbService.updateLayerStyle(selectedLayer.id, newStyle);

                // Also need to "reset" the local layer style to avoid Legend showing categories
                // This is handled by useMapStore.updateLayerColor? 
                // No, updateLayerColor just changes the hex string. 
                // We might need to clear the categorization style in the store too if we are switching to single color.
                // Ideally we should have a 'resetStyle' action or 'setSimpleStyle'.
                // For now, let's keep it simple: Changing color updates the visual. 
                // If it was categorized, it might look weird if we don't clear categories.
            } catch (e) {
                console.error("Failed to save color preference", e);
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
                        </div>
                    )}

                    {layers.length > 0 && (
                        <div className="mb-4">
                            <label className="flex items-center gap-2 w-full p-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer transition-colors dashed">
                                {loading ? <Loader2 className="animate-spin" size={16} /> : <FileUp size={16} />}
                                <span>Importar nova camada...</span>
                                <input type="file" className="hidden" accept=".geojson,.json,.kml,.kmz,.zip" onChange={handleFileUpload} />
                            </label>
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
                </div>

                <div className="text-[10px] text-center text-slate-400 p-2 border-t border-slate-100">
                    <button onClick={async () => {
                        if (confirm('Limpar cache e recarregar?')) {
                            const { CacheService } = await import('../utils/CacheService');
                            await CacheService.clear();
                            window.location.reload();
                        }
                    }} className="hover:text-red-500 transition-colors">Limpar Cache</button>
                </div>
            </div>

            <StyleOptionsModal
                isOpen={styleModalOpen}
                onClose={() => setStyleModalOpen(false)}
                onSelectColor={handleColorChange}
                onSelectClassify={() => {
                    if (selectedLayer) handleClassifyLayer(selectedLayer);
                }}
            />

            <FieldSelectionModal
                isOpen={fieldModalOpen}
                onClose={() => setFieldModalOpen(false)}
                onSelect={(field) => {
                    if (selectedLayer) {
                        useMapStore.getState().classifyLayer(selectedLayer.id, field);
                        setFieldModalOpen(false);
                    }
                }}
                fields={classificationFields}
                layerName={selectedLayer?.name || ''}
            />
        </>
    );
};

