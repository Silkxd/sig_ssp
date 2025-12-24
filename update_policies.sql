-- Allow public to update collections (e.g. for saving metadata/styles)
CREATE POLICY "Allow public update access on collections"
ON public.collections
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
