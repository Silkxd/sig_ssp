import React, { useState, useEffect } from 'react';
import { Palette, X, Layers } from 'lucide-react';

interface ClassificationEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (classMap: Record<string, string>, weight: number, borderColor: string) => void;
    onReset: () => void;
    field: string;
    uniqueValues: string[];
    initialClassMap?: Record<string, string>;
    initialBorderColor?: string;
    layerName: string;
}

const DEFAULT_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
    '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#881337'
];

export const ClassificationEditorModal: React.FC<ClassificationEditorModalProps> = ({
    isOpen,
    onClose,
    onSave,
    onReset,
    field,
    uniqueValues,
    initialClassMap,
    initialBorderColor,
    layerName
}) => {
    const [classMap, setClassMap] = useState<Record<string, string>>({});
    const [weight, setWeight] = useState<number>(2);
    const [borderColor, setBorderColor] = useState<string>('#333333');

    useEffect(() => {
        if (isOpen) {
            // Initialize map
            if (initialClassMap && Object.keys(initialClassMap).length > 0) {
                setClassMap(initialClassMap);
            } else {
                // Generate default
                const newMap: Record<string, string> = {};
                uniqueValues.forEach((val, index) => {
                    newMap[val] = DEFAULT_COLORS[index % DEFAULT_COLORS.length];
                });
                setClassMap(newMap);
            }
            // Reset weight to default if new, can pass prop later if needed, but for 'new' classification 2 is fine
            setWeight(2);
            setBorderColor(initialBorderColor || '#333333');
        }
    }, [isOpen, uniqueValues, initialClassMap, initialBorderColor]);

    if (!isOpen) return null;

    const handleColorChange = (value: string, color: string) => {
        setClassMap(prev => ({ ...prev, [value]: color }));
    };

    const handleSave = () => {
        onSave(classMap, weight, borderColor);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                    <div>
                        <h3 className="font-semibold text-lg text-slate-800 flex items-center gap-2">
                            <Layers size={18} className="text-blue-600" />
                            Editor de Classificação
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Campo: <span className="font-medium text-slate-700">{field}</span> • Camada: <span className="font-medium text-slate-700">{layerName}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Global Weight & Border Color Setting */}
                    <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-medium text-slate-700">Espessura da Borda</label>
                                    <span className="text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-600">{weight}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="1"
                                    value={weight}
                                    onChange={(e) => setWeight(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-700">Cor da Borda</label>
                                <div className="relative group">
                                    <div
                                        className="w-10 h-10 rounded-lg shadow-sm border border-slate-300 cursor-pointer"
                                        style={{ backgroundColor: borderColor }}
                                    ></div>
                                    <input
                                        type="color"
                                        value={borderColor}
                                        onChange={(e) => setBorderColor(e.target.value)}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Values List */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Valores Encontrados ({uniqueValues.length})</h4>
                        <div className="grid gap-3">
                            {uniqueValues.map((val) => (
                                <div key={val} className="flex items-center gap-3 p-2 border border-slate-100 rounded-lg hover:border-slate-300 transition-colors bg-white">
                                    <div className="relative group shrink-0">
                                        <div
                                            className="w-8 h-8 rounded-lg shadow-sm border border-slate-200 cursor-pointer transition-transform group-hover:scale-105"
                                            style={{ backgroundColor: classMap[val] || '#ccc' }}
                                        ></div>
                                        <input
                                            type="color"
                                            value={classMap[val] || '#000000'}
                                            onChange={(e) => handleColorChange(val, e.target.value)}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                        />
                                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Palette size={14} className="text-white drop-shadow-md" />
                                        </div>
                                    </div>
                                    <span className="text-sm text-slate-700 font-medium truncate flex-1" title={val}>
                                        {val}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl shrink-0 flex flex-col gap-2">
                    <button
                        onClick={handleSave}
                        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm active:scale-[0.98] transition-all"
                    >
                        Aplicar e Salvar Classificação
                    </button>

                    <button
                        onClick={onReset}
                        className="w-full py-2 px-4 text-slate-500 hover:text-red-500 text-sm hover:bg-red-50 rounded-lg transition-colors"
                    >
                        Redefinir Estilo (Voltar para Padrão)
                    </button>
                </div>
            </div>
        </div>
    );
};
