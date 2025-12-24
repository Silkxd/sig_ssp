import React, { useState, useEffect } from 'react';
import type { MapLayer } from '../store/useMapStore';
import { Eye, EyeOff, Trash2, ZoomIn, Save, Palette, MoreVertical } from 'lucide-react';
import clsx from 'clsx';

interface LayerRowProps {
    layer: MapLayer;
    groups: any[];
    onFocus: (id: string) => void;
    onToggleVisibility: (id: string) => void;
    onSetOpacity: (id: string, opacity: number) => void;
    onRemove: (layer: MapLayer) => void;
    onSave: (layer: MapLayer) => void;
    onClassifyOrColor: (layer: MapLayer) => void;
    onMove: (layerId: string, groupId: string | null) => void;
}

export const LayerRow: React.FC<LayerRowProps> = ({
    layer,
    groups,
    onFocus,
    onToggleVisibility,
    onSetOpacity,
    onRemove,
    onSave,
    onClassifyOrColor,
    onMove
}) => {
    // Local state for smooth slider interaction
    const [localOpacity, setLocalOpacity] = useState(layer.opacity);

    // Sync local state when prop changes (e.g. from external updates)
    useEffect(() => {
        setLocalOpacity(layer.opacity);
    }, [layer.opacity]);

    const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalOpacity(parseFloat(e.target.value));
    };

    const handleOpacityCommit = () => {
        if (localOpacity !== layer.opacity) {
            onSetOpacity(layer.id, localOpacity);
        }
    };

    return (
        <div className={clsx(
            "p-2 rounded-lg border border-transparent hover:bg-slate-50 transition-colors group",
            layer.groupId ? "ml-4 border-l-2 border-l-slate-200" : "bg-white border-slate-200 shadow-sm"
        )}>
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: layer.color }}></div>
                    <span className="font-medium text-sm text-slate-700 truncate" title={layer.name}>{layer.name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onFocus(layer.id)} className="p-1 hover:text-blue-600" title="Zoom"><ZoomIn size={14} /></button>
                    <button onClick={() => onClassifyOrColor(layer)} className="p-1 hover:text-purple-600" title="Estilo / Cor"><Palette size={14} /></button>
                    {layer.type === 'upload' && <button onClick={() => onSave(layer)} className="p-1 hover:text-green-600" title="Salvar no BD"><Save size={14} /></button>}
                    <button onClick={() => onToggleVisibility(layer.id)} className="p-1 hover:text-slate-800" title="Alternar Visibilidade">{layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                    <button onClick={() => onRemove(layer)} className="p-1 hover:text-red-600" title="Remover"><Trash2 size={14} /></button>

                    {/* Move to Group Dropdown */}
                    <div className="relative group/menu">
                        <button className="p-1 hover:text-slate-800"><MoreVertical size={14} /></button>
                        <div className="absolute right-0 top-full hidden group-hover/menu:block bg-white shadow-xl border border-slate-100 rounded-md py-1 z-50 min-w-[120px]">
                            <div className="text-[10px] uppercase text-slate-400 px-2 py-1">Mover para Grupo</div>
                            <button onClick={() => onMove(layer.id, null)} className="w-full text-left px-2 py-1 text-xs hover:bg-slate-50 block">Raiz (Nenhum)</button>
                            {groups.map(g => (
                                <button key={g.id} onClick={() => onMove(layer.id, g.id)} className="w-full text-left px-2 py-1 text-xs hover:bg-slate-50 block truncate">
                                    {g.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {layer.visible && (
                <input
                    type="range" min="0" max="1" step="0.1"
                    value={localOpacity}
                    onChange={handleOpacityChange}
                    onMouseUp={handleOpacityCommit}
                    onTouchEnd={handleOpacityCommit}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
            )}
        </div>
    );
};
