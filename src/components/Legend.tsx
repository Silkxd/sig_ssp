import React, { useState } from 'react';
import { useMapStore } from '../store/useMapStore';
import { DbService } from '../utils/DbService';
import { ChevronDown, ChevronUp, Palette, Save } from 'lucide-react';
// The original DbService import from '../services/DbService' is removed as per the instruction's implied replacement.

export const Legend: React.FC = () => {
    const { layers, openModal } = useMapStore();
    const [minimized, setMinimized] = useState(false);
    const [saving, setSaving] = useState(false);

    // Find active classified layer (assuming one for simplicity, or we show all)
    // For now, let's show the first categorized layer we find, or all of them.
    const classifiedLayers = layers.filter(l => l.visible && l.style?.type === 'categorized');

    if (classifiedLayers.length === 0) return null;

    // ... filtering code ...

    const handleSaveStyle = async (layer: any) => {
        if (layer.type !== 'database') {
            openModal({
                type: 'alert',
                title: 'Atenção',
                message: 'Você deve salvar a camada no banco de dados antes de salvar seu estilo.',
                variant: 'default'
            });
            return;
        }

        openModal({
            type: 'confirm',
            title: 'Salvar Estilo',
            message: `Salvar estilo de classificação atual para "${layer.name}"? Este estilo será carregado por padrão.`,
            onConfirm: async () => {
                setSaving(true);
                try {
                    await DbService.updateLayerStyle(layer.id, layer.style);
                    openModal({ type: 'alert', title: 'Sucesso', message: 'Estilo salvo com sucesso!' });
                } catch (error) {
                    console.error(error);
                    openModal({ type: 'alert', title: 'Erro', message: 'Falha ao salvar estilo.', variant: 'danger' });
                } finally {
                    setSaving(false);
                }
            }
        });
    };

    return (
        <div className="absolute bottom-6 right-6 z-[1000] bg-white p-3 rounded-lg shadow-xl border border-slate-200 w-64 max-h-[400px] flex flex-col transition-all">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                    <Palette size={16} />
                    Legenda
                </h3>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setMinimized(!minimized)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500"
                    >
                        {minimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {!minimized && (
                <div className="overflow-y-auto max-h-[300px] pr-1 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                    {classifiedLayers.map(layer => (
                        <div key={layer.id} className="mb-4 last:mb-0 group">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-bold text-slate-500 uppercase">{layer.name}</p>
                                {layer.type === 'database' && (
                                    <button
                                        onClick={() => handleSaveStyle(layer)}
                                        disabled={saving}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-green-600"
                                        title="Salvar Estilo no Banco"
                                    >
                                        <Save size={14} />
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 mb-2">Campo: {layer.style?.field}</p>

                            <div className="space-y-1">
                                {Object.entries(layer.style?.classMap || {}).map(([val, color]) => (
                                    <div key={val} className="flex items-center gap-2 text-xs">
                                        <div
                                            className="w-3 h-3 rounded-full shadow-sm flex-shrink-0"
                                            style={{ backgroundColor: color }}
                                        />
                                        <span className="truncate text-slate-700" title={val}>{val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {minimized && (
                <div className="text-xs text-slate-400">
                    {classifiedLayers.length} camada(s) ativa(s)
                </div>
            )}
        </div>
    );
};
