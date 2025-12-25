import React, { useState, useEffect } from 'react';
import type { MapLayer } from '../store/useMapStore';
import { Eye, EyeOff, Trash2, ZoomIn, Save, Palette, MoreVertical, ChevronRight, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { ContextMenu } from './ui/ContextMenu';

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
    const [isLegendExpanded, setIsLegendExpanded] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

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

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    // Construct Menu Options
    const menuOptions = [
        {
            label: 'Zoom na Camada',
            icon: <ZoomIn size={14} />,
            onClick: () => onFocus(layer.id)
        },
        {
            label: 'Estilo / Cores',
            icon: <Palette size={14} />,
            onClick: () => onClassifyOrColor(layer)
        },
        {
            label: layer.visible ? 'Ocultar Camada' : 'Mostrar Camada',
            icon: layer.visible ? <EyeOff size={14} /> : <Eye size={14} />,
            onClick: () => onToggleVisibility(layer.id)
        }
    ];

    if (layer.type === 'upload') {
        menuOptions.push({
            label: 'Salvar no Banco (Permanente)',
            icon: <Save size={14} />,
            onClick: () => onSave(layer)
        });
    }

    const groupOptions = [
        'separator' as const,
        {
            label: 'Mover para: Raiz',
            onClick: () => onMove(layer.id, null),
            icon: <MoreVertical size={14} />
        },
        ...groups.map(g => ({
            label: `Mover para: ${g.name}`,
            onClick: () => onMove(layer.id, g.id),
            icon: <MoreVertical size={14} />
        }))
    ];

    const fullOptions = [
        ...menuOptions,
        ...groupOptions,
        'separator' as const,
        {
            label: 'Remover Camada',
            variant: 'danger' as const,
            icon: <Trash2 size={14} />,
            onClick: () => onRemove(layer)
        }
    ];

    return (
        <div
            className={clsx(
                "p-2 rounded-lg border border-transparent hover:bg-slate-50 transition-colors group select-none cursor-context-menu relative",
                layer.groupId ? "ml-4 border-l-2 border-l-slate-200" : "bg-white border-slate-200 shadow-sm",
                !layer.visible && "opacity-60 grayscale"
            )}
            onContextMenu={handleContextMenu}
        >
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 overflow-hidden">
                    {/* Status Icon (Clickable for quick toggle) */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                        className="text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                        {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>

                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: layer.color }}></div>
                    <span className="font-medium text-sm text-slate-700 truncate" title={layer.name}>{layer.name}</span>
                </div>

                {/* No buttons here anymore */}
            </div>

            {layer.visible && (
                <input
                    type="range" min="0" max="1" step="0.1"
                    value={localOpacity}
                    onChange={handleOpacityChange}
                    onMouseUp={handleOpacityCommit}
                    onTouchEnd={handleOpacityCommit}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
            )}

            {/* Collapsible Legend */}
            {layer.style?.type === 'categorized' && layer.style.classMap && (
                <div className="mt-2 text-xs">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsLegendExpanded(!isLegendExpanded); }}
                        className="flex items-center gap-1 text-slate-500 hover:text-slate-700 font-medium mb-1 transition-colors"
                    >
                        {isLegendExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        Legenda ({Object.keys(layer.style.classMap).length})
                    </button>

                    {isLegendExpanded && (
                        <div className="pl-4 space-y-1 mt-1 border-l border-slate-200 ml-1.5 animate-in slide-in-from-top-1 duration-200">
                            {Object.entries(layer.style.classMap).map(([value, color]) => (
                                <div key={value} className="flex items-center gap-2">
                                    <div
                                        className="w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm shrink-0"
                                        style={{ backgroundColor: color }}
                                    ></div>
                                    <span className="text-slate-600 truncate" title={value}>{value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    options={fullOptions} // @ts-ignore
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
};
