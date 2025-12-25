import React, { useState } from 'react';
import { Database, X, Loader2, AlertCircle, ChevronRight, CheckCircle, ArrowLeft } from 'lucide-react';
import { ProxyService } from '../utils/ProxyService';
import { useMapStore } from '../store/useMapStore';

interface ExternalLayerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ExternalLayerModal: React.FC<ExternalLayerModalProps> = ({ isOpen, onClose }) => {
    const { addLayer } = useMapStore();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initial Config
    const [config, setConfig] = useState({
        host: 'localhost',
        port: '5432',
        user: 'postgres',
        password: '',
        database: 'ssp_data',
        // metadata
        schema: '',
        table: '',
        latCol: '',
        lonCol: '',
        layerName: ''
    });

    // Metadata State
    const [schemas, setSchemas] = useState<string[]>([]);
    const [tables, setTables] = useState<string[]>([]);
    const [columns, setColumns] = useState<any[]>([]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setConfig({ ...config, [e.target.name]: e.target.value });
    };

    // Step 1: CONNECTION
    const handleTestConnection = async () => {
        setLoading(true);
        setError(null);
        try {
            await ProxyService.testConnection(config);
            const schemaList = await ProxyService.listSchemas(config);
            setSchemas(schemaList);
            setStep(2);
        } catch (err: any) {
            setError(err.message || 'Falha na conexão.');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: SELECTION
    const handleSchemaChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const schema = e.target.value;
        setConfig({ ...config, schema, table: '' });
        if (schema) {
            setLoading(true);
            try {
                const tableList = await ProxyService.listTables({ ...config, schema });
                setTables(tableList);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        } else {
            setTables([]);
        }
    };

    const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setConfig({ ...config, table: e.target.value });
    };

    const handleProceedToMapping = async () => {
        if (!config.schema || !config.table) {
            setError("Selecione um esquema e uma tabela.");
            return;
        }
        setLoading(true);
        try {
            const cols = await ProxyService.listColumns(config);
            setColumns(cols);
            // Auto-detect columns
            const lat = cols.find((c: any) => c.column_name.toLowerCase().match(/lat/))?.column_name || '';
            const lon = cols.find((c: any) => c.column_name.toLowerCase().match(/lon|lng/))?.column_name || '';

            setConfig(prev => ({
                ...prev,
                latCol: lat,
                lonCol: lon,
                layerName: prev.table
            }));

            setStep(3);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 3: MAPPING & FETCH
    const handleFetchLayer = async () => {
        setLoading(true);
        setError(null);
        try {
            const geojson = await ProxyService.fetchExternalLayer(config);

            if (geojson && geojson.features && geojson.features.length > 0) {
                addLayer({
                    id: crypto.randomUUID(),
                    name: config.layerName || config.table,
                    visible: true,
                    opacity: 1,
                    color: '#3b82f6',
                    type: 'upload',
                    connectionConfig: config,
                    data: geojson
                });
                onClose();
            } else {
                setError("Nenhum dado encontrado ou formato inválido.");
            }
        } catch (err: any) {
            setError(err.message || "Erro ao conectar.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                    <div>
                        <h3 className="font-semibold text-lg text-slate-800 flex items-center gap-2">
                            <Database size={18} className="text-blue-600" />
                            Conectar Banco Externo
                        </h3>
                        {step === 1 && <p className="text-xs text-slate-500 mt-1">Passo 1: Configurar Conexão</p>}
                        {step === 2 && <p className="text-xs text-slate-500 mt-1">Passo 2: Selecionar Tabela</p>}
                        {step === 3 && <p className="text-xs text-slate-500 mt-1">Passo 3: Mapear Colunas</p>}
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100 mb-4">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Host</label>
                                    <input name="host" value={config.host} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="10.x.x.x" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Porta</label>
                                    <input name="port" value={config.port} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="5432" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Usuário</label>
                                    <input name="user" value={config.user} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Senha</label>
                                    <input name="password" type="password" value={config.password} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded text-sm" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Database</label>
                                <input name="database" value={config.database} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded text-sm" />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Schema</label>
                                <select name="schema" value={config.schema} onChange={handleSchemaChange} className="w-full p-2 border border-slate-200 rounded text-sm bg-white">
                                    <option value="">Selecione um schema...</option>
                                    {schemas.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Tabela / View</label>
                                <select name="table" value={config.table} onChange={handleTableChange} className="w-full p-2 border border-slate-200 rounded text-sm bg-white" disabled={!config.schema}>
                                    <option value="">Selecione uma tabela...</option>
                                    {tables.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Col. Latitude</label>
                                    <select name="latCol" value={config.latCol} onChange={handleChange as any} className="w-full p-2 border border-slate-200 rounded text-sm bg-white">
                                        <option value="">Selecione...</option>
                                        {columns.map(c => <option key={c.column_name} value={c.column_name}>{c.column_name} ({c.data_type})</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Col. Longitude</label>
                                    <select name="lonCol" value={config.lonCol} onChange={handleChange as any} className="w-full p-2 border border-slate-200 rounded text-sm bg-white">
                                        <option value="">Selecione...</option>
                                        {columns.map(c => <option key={c.column_name} value={c.column_name}>{c.column_name} ({c.data_type})</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Nome da Camada (Apelido)</label>
                                <input name="layerName" value={config.layerName} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded text-sm" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl shrink-0 flex justify-between items-center">
                    {step > 1 ? (
                        <button onClick={() => setStep(prev => (prev - 1) as any)} className="text-slate-500 hover:text-slate-800 text-sm flex items-center gap-1">
                            <ArrowLeft size={16} /> Voltar
                        </button>
                    ) : <div></div>}

                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors">
                            Cancelar
                        </button>

                        {step === 1 && (
                            <button
                                onClick={handleTestConnection}
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading && <Loader2 size={16} className="animate-spin" />}
                                Testar Conexão <ChevronRight size={16} />
                            </button>
                        )}
                        {step === 2 && (
                            <button
                                onClick={handleProceedToMapping}
                                disabled={loading || !config.table}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading && <Loader2 size={16} className="animate-spin" />}
                                Próximo <ChevronRight size={16} />
                            </button>
                        )}
                        {step === 3 && (
                            <button
                                onClick={handleFetchLayer}
                                disabled={loading || !config.latCol || !config.lonCol}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                {loading ? 'Carregando...' : 'Finalizar e Carregar'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
