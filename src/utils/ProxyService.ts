export const ProxyService = {
    async request(endpoint: string, config: any) {
        try {
            const response = await fetch(`http://localhost:3001/api/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || `Failed to fetch ${endpoint}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Proxy Service Error (${endpoint}):`, error);
            throw error;
        }
    },

    async testConnection(config: any) {
        return this.request('check-connection', config);
    },

    async listSchemas(config: any) {
        return this.request('list-schemas', config);
    },

    async listTables(config: any) {
        return this.request('list-tables', config);
    },

    async listColumns(config: any) {
        return this.request('list-columns', config);
    },

    async fetchExternalLayer(config: any) {
        return this.request('fetch-layer', config);
    }
};
