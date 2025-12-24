-- Create a new table for tracking uploaded raw files
create table if not exists public.spatial_uploads (
    id uuid primary key default gen_random_uuid(),
    filename text not null,
    file_url text not null,
    file_type text, -- 'geojson', 'kml', 'shp', etc.
    uploaded_at timestamptz default now(),
    processed boolean default false, -- to track if we've parsed it into features
    metadata jsonb default '{}'::jsonb
);

-- Enable RLS
alter table public.spatial_uploads enable row level security;

-- Policies for spatial_uploads
create policy "Allow public read access on spatial_uploads"
on public.spatial_uploads for select to public using (true);

create policy "Allow public insert access on spatial_uploads"
on public.spatial_uploads for insert to public with check (true);

-- Create Storage Bucket 'raw_files'
-- Note: This requires the storage schema to be available.
-- We insert into storage.buckets if it doesn't exist. 
-- In some Supabase setups, you might need to use the dashboard to create buckets if you don't have direct SQL access to the storage schema.
insert into storage.buckets (id, name, public)
values ('raw_files', 'raw_files', true)
on conflict (id) do nothing;

-- Storage Policies (Public Access)
-- DROP POLICY IF EXISTS "Public Access" ON storage.objects;
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'raw_files' );

-- DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
create policy "Public Upload"
on storage.objects for insert
with check ( bucket_id = 'raw_files' );
