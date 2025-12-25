import { useState, useEffect } from 'react';
import { useMapStore } from '../store/useMapStore';
import { Modal } from './ui/Modal';
import { AlertCircle, Check } from 'lucide-react';

export const GlobalModalRenderer = () => {
    const { modal, closeModal } = useMapStore();
    const [promptValue, setPromptValue] = useState('');

    useEffect(() => {
        if (modal.isOpen && modal.type === 'prompt') {
            setPromptValue(modal.defaultValue || '');
        }
    }, [modal.isOpen, modal.type, modal.defaultValue]);

    if (!modal.isOpen) return null;

    const handleConfirm = () => {
        if (modal.onConfirm) {
            modal.onConfirm(modal.type === 'prompt' ? promptValue : undefined);
        }
        closeModal();
    };

    return (
        <Modal
            isOpen={modal.isOpen}
            onClose={closeModal}
            title={modal.title}
            variant={modal.variant || 'default'}
            footer={
                <div className="flex justify-end gap-2 w-full">
                    {modal.type !== 'alert' && (
                        <button
                            onClick={closeModal}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                            Cancelar
                        </button>
                    )}
                    <button
                        onClick={handleConfirm}
                        className={`px-4 py-2 text-sm text-white rounded-lg ${modal.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {modal.type === 'alert' ? 'OK' : 'Confirmar'}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                {modal.type === 'alert' && (
                    <div className="flex items-start gap-3">
                        {modal.variant === 'danger' ? (
                            <AlertCircle className="text-red-500 flex-shrink-0" />
                        ) : (
                            <Check className="text-green-500 flex-shrink-0" />
                        )}
                        <p className="text-slate-600">{modal.message}</p>
                    </div>
                )}

                {modal.type === 'confirm' && (
                    <p className="text-slate-600">{modal.message}</p>
                )}

                {modal.type === 'prompt' && (
                    <>
                        <p className="text-slate-600">{modal.message}</p>
                        <input
                            autoFocus
                            type="text"
                            value={promptValue}
                            onChange={(e) => setPromptValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </>
                )}
            </div>
        </Modal>
    );
};
