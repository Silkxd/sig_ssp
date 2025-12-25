import express from 'express';
import cors from 'cors';
import pg from 'pg';
const { Client } = pg;

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Helper to create and connect a client
const createClient = async (config) => {
    const { host, port, user, password, database } = config;
    const client = new Client({
        host,
        port: parseInt(port || 5432),
        user,
        password,
        database,
        ssl: false
    });
    await client.connect();
    return client;
};

// Check Connection
app.post('/api/check-connection', async (req, res) => {
    let client;
    try {
        client = await createClient(req.body);
        await client.query('SELECT 1');
        res.json({ success: true, message: 'Conectado com sucesso!' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

// List Schemas
app.post('/api/list-schemas', async (req, res) => {
    let client;
    try {
        client = await createClient(req.body);
        const result = await client.query(`
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast') 
            AND schema_name NOT LIKE 'pg_%'
            ORDER BY schema_name
        `);
        res.json(result.rows.map(r => r.schema_name));
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

// List Tables
app.post('/api/list-tables', async (req, res) => {
    let client;
    try {
        client = await createClient(req.body);
        const { schema } = req.body;
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = $1 
            ORDER BY table_name
        `, [schema || 'public']);
        res.json(result.rows.map(r => r.table_name));
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

// List Columns
app.post('/api/list-columns', async (req, res) => {
    let client;
    try {
        client = await createClient(req.body);
        const { schema, table } = req.body;
        const result = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = $1 
            AND table_name = $2
            ORDER BY ordinal_position
        `, [schema, table]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

// Fetch Layer (Enhanced)
app.post('/api/fetch-layer', async (req, res) => {
    const { host, port, user, password, database, schema, table, latCol, lonCol } = req.body;
    let client;

    try {
        client = new Client({
            host,
            port: parseInt(port || 5432),
            user,
            password,
            database,
            ssl: false
        });
        await client.connect();

        console.log(`Fetching from ${schema}.${table}`);

        const safeSchema = schema ? `"${schema}"` : '"public"';
        const safeTable = `"${table}"`;
        // Safe identifier quoting:
        const safeLat = `"${latCol}"`;
        const safeLon = `"${lonCol}"`;

        const query = `
            SELECT *,
                   ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(${safeLon}::float, ${safeLat}::float), 4326))::json as _geometry_json
            FROM ${safeSchema}.${safeTable}
            LIMIT 50000
        `;

        const result = await client.query(query);

        const features = result.rows.map(row => {
            const geometry = row._geometry_json;
            if (row.id) row.id = String(row.id);
            delete row._geometry_json;

            // Fallback
            if (!geometry) {
                const lat = parseFloat(row[latCol]);
                const lon = parseFloat(row[lonCol]);
                if (!isNaN(lat) && !isNaN(lon)) {
                    return {
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [lon, lat] },
                        properties: row
                    };
                }
                return null;
            }

            return {
                type: 'Feature',
                geometry: geometry,
                properties: row
            };
        }).filter(f => f !== null);

        const geojson = {
            type: 'FeatureCollection',
            features: features
        };

        res.json(geojson);

    } catch (err) {
        console.error('Database query failed:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (client) await client.end();
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});
