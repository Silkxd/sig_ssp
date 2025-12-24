-- Create table for Layer Groups
create table if not exists public.layer_groups (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    visible boolean default true,
    collapsed boolean default false,
    created_at timestamptz default now()
);

-- Add group_id to collections table
alter table public.collections 
add column if not exists group_id uuid references public.layer_groups(id) on delete set null;

-- Enable RLS
alter table public.layer_groups enable row level security;

-- Policies for Layer Groups (Public Access)
create policy "Allow public read access on layer_groups"
on public.layer_groups for select to public using (true);

create policy "Allow public insert access on layer_groups"
on public.layer_groups for insert to public with check (true);

create policy "Allow public update access on layer_groups"
on public.layer_groups for update to public using (true);

create policy "Allow public delete access on layer_groups"
on public.layer_groups for delete to public using (true);
