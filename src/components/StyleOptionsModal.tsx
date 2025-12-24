import React from 'react';
import { Palette, List } from 'lucide-react';

interface StyleOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectColor: (color: string) => void;
    onSelectClassify: () => void;
}

export const StyleOptionsModal: React.FC<StyleOptionsModalProps> = ({
    isOpen,
    onClose,
    onSelectColor,
    onSelectClassify
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-semibold text-lg text-slate-800">Estilo da Camada</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600 mb-4">Como você deseja alterar o estilo desta camada?</p>

                    <div className="grid grid-cols-2 gap-4">
                        <label className="flex flex-col items-center justify-center gap-3 p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all group">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Palette size={20} />
                            </div>
                            <span className="text-sm font-medium text-slate-700">Cor Única</span>
                            <input
                                type="color"
                                className="absolute w-0 h-0 opacity-0"
                                onChange={(e) => {
                                    onSelectColor(e.target.value);
                                    onClose();
                                }}
                            />
                        </label>

                        <button
                            onClick={() => {
                                onSelectClassify();
                                onClose();
                            }}
                            className="flex flex-col items-center justify-center gap-3 p-4 border border-slate-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 cursor-pointer transition-all group"
                        >
                            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <List size={20} />
                            </div>
                            <span className="text-sm font-medium text-slate-700">Classificar</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
