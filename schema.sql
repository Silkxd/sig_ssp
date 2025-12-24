-- Enable PostGIS extension
create extension if not exists postgis;

-- Create table for Layer Collections (e.g., uploads)
create table if not exists public.collections (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    created_at timestamptz default now(),
    metadata jsonb default '{}'::jsonb
);

-- Create table for Features (Geometry storage)
create table if not exists public.features (
    id uuid primary key default gen_random_uuid(),
    collection_id uuid references public.collections(id) on delete cascade,
    properties jsonb default '{}'::jsonb,
    geom geometry(Geometry, 4326), -- Supports all geometry types in WGS84
    created_at timestamptz default now()
);

-- Search index for spatial queries
create index if not exists features_geom_idx on public.features using gist (geom);

-- Row Level Security (RLS) - Enable RLS
alter table public.collections enable row level security;
alter table public.features enable row level security;

-- Policies (Public Access for Demo - Adjust for Production)
-- Allow read access to everyone
create policy "Allow public read access on collections"
on public.collections for select to public using (true);

create policy "Allow public read access on features"
on public.features for select to public using (true);

-- Allow insert access to everyone (for upload demo)
create policy "Allow public insert access on collections"
on public.collections for insert to public with check (true);

create policy "Allow public insert access on features"
on public.features for insert to public with check (true);
