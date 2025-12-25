import React from 'react';
import { Palette, List } from 'lucide-react';

interface StyleOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentWeight?: number;
    onSelectColor: (color: string, weight: number) => void;
    onSelectBorderOnly: (color: string, weight: number) => void;
    onSelectClassify: () => void;
}

export const StyleOptionsModal: React.FC<StyleOptionsModalProps> = ({
    isOpen,
    onClose,
    currentWeight = 2,
    onSelectColor,
    onSelectBorderOnly,
    onSelectClassify
}) => {
    const [selectedMode, setSelectedMode] = React.useState<'simple' | 'border' | null>(null);
    const [selectedColor, setSelectedColor] = React.useState<string>('#3b82f6'); // Default blue
    const [selectedWeight, setSelectedWeight] = React.useState<number>(currentWeight);

    // Reset weight when modal re-opens or prop changes (optional, but good for UX)
    React.useEffect(() => {
        if (isOpen) {
            setSelectedWeight(currentWeight);
        }
    }, [isOpen, currentWeight]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (selectedMode === 'simple') {
            onSelectColor(selectedColor, selectedWeight);
        } else if (selectedMode === 'border') {
            onSelectBorderOnly(selectedColor, selectedWeight);
        }
        onClose();
        setSelectedMode(null);
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-semibold text-lg text-slate-800">Estilo da Camada</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
                </div>

                <div className="p-6 space-y-6">
                    <p className="text-sm text-slate-600">Como você deseja alterar o estilo desta camada?</p>

                    <div className="grid grid-cols-3 gap-3">
                        {/* Option 1: Simple Color */}
                        <label className={`
                            relative flex flex-col items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer transition-all group text-center
                            ${selectedMode === 'simple' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}
                        `}>
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center pointer-events-none">
                                <Palette size={18} />
                            </div>
                            <span className="text-xs font-medium text-slate-700">Cor Única</span>
                            <div className="absolute inset-0 opacity-0 cursor-pointer">
                                <input
                                    type="color"
                                    className="w-full h-full cursor-pointer"
                                    onChange={(e) => {
                                        setSelectedColor(e.target.value);
                                        setSelectedMode('simple');
                                    }}
                                />
                            </div>
                            {selectedMode === 'simple' && (
                                <div className="absolute top-2 right-2 w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: selectedColor }}></div>
                            )}
                        </label>

                        {/* Option 2: Border Only */}
                        <label className={`
                            relative flex flex-col items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer transition-all group text-center
                            ${selectedMode === 'border' ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}
                        `}>
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border-2 border-emerald-600 bg-transparent pointer-events-none">
                                <div className="w-full h-full rounded-full border border-white opacity-0"></div>
                            </div>
                            <span className="text-xs font-medium text-slate-700">Apenas Borda</span>
                            <div className="absolute inset-0 opacity-0 cursor-pointer">
                                <input
                                    type="color"
                                    className="w-full h-full cursor-pointer"
                                    onChange={(e) => {
                                        setSelectedColor(e.target.value);
                                        setSelectedMode('border');
                                    }}
                                />
                            </div>
                            {selectedMode === 'border' && (
                                <div className="absolute top-2 right-2 w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: selectedColor }}></div>
                            )}
                        </label>

                        {/* Option 3: Classify */}
                        <button
                            onClick={() => {
                                onSelectClassify();
                                onClose();
                            }}
                            className="flex flex-col items-center justify-center gap-2 p-3 border border-slate-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 cursor-pointer transition-all group text-center"
                        >
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center pointer-events-none">
                                <List size={18} />
                            </div>
                            <span className="text-xs font-medium text-slate-700">Classificar</span>
                        </button>
                    </div>

                    {/* Border Width Slider */}
                    {(selectedMode === 'simple' || selectedMode === 'border') && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <div className="flex justify-between items-center text-xs font-medium text-slate-600">
                                <span>Espessura da Borda</span>
                                <span>{selectedWeight}px</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                step="1"
                                value={selectedWeight}
                                onChange={(e) => setSelectedWeight(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-800"
                            />
                        </div>
                    )}

                    {/* Save Button */}

                    {/* Save Button */}
                    <button
                        disabled={!selectedMode}
                        onClick={handleSave}
                        className={`
                            w-full py-2 px-4 rounded-lg font-medium text-white transition-all
                            ${selectedMode ? 'bg-blue-600 hover:bg-blue-700 shadow-md' : 'bg-slate-300 cursor-not-allowed'}
                        `}
                    >
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};
