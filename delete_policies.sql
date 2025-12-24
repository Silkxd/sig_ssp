-- Enable Delete Access for Collections
create policy "Allow public delete access on collections"
on public.collections for delete to public using (true);

-- Enable Delete Access for Features
create policy "Allow public delete access on features"
on public.features for delete to public using (true);

-- Enable Delete Access for Spatial Uploads (optional, for future use)
create policy "Allow public delete access on spatial_uploads"
on public.spatial_uploads for delete to public using (true);
