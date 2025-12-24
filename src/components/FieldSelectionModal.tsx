import React from 'react';
import { X, ListFilter } from 'lucide-react';

interface FieldSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (field: string) => void;
    fields: string[];
    layerName: string;
}

export const FieldSelectionModal: React.FC<FieldSelectionModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    fields,
    layerName
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <ListFilter size={18} className="text-primary" />
                        Classify Layer: <span className="text-primary truncate max-w-[150px]">{layerName}</span>
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    <p className="text-sm text-slate-500 mb-4">
                        Select a field to classify features by. Unique colors will be assigned to each value.
                    </p>

                    {fields.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            No properties found for this layer.
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            {fields.map((field) => (
                                <button
                                    key={field}
                                    onClick={() => onSelect(field)}
                                    className="text-left px-4 py-3 rounded-lg border border-slate-200 hover:border-primary hover:bg-slate-50 hover:text-primary transition-all flex items-center justify-between group"
                                >
                                    <span className="font-medium text-slate-700 group-hover:text-primary">{field}</span>
                                    <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">Select</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-100 text-xs text-center text-slate-400">
                    Showing {fields.length} available fields
                </div>
            </div>
        </div>
    );
};
