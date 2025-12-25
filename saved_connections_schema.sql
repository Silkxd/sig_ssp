-- Create table for saved connections
CREATE TABLE IF NOT EXISTS saved_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    host TEXT NOT NULL,
    port TEXT NOT NULL,
    "user" TEXT NOT NULL,
    password TEXT,
    database TEXT NOT NULL,
    last_used_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure unique connections to avoid duplicates (Upsert target)
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_connections_unique 
ON saved_connections (host, port, "user", database);

-- Enable RLS (Optional, depending on your policy setup, enabling public access for now as per previous patterns)
ALTER TABLE saved_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for all users" ON saved_connections
    FOR ALL USING (true) WITH CHECK (true);
