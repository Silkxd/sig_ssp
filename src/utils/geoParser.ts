import * as toGeoJSON from '@mapbox/togeojson';
import shp from 'shpjs';
import type { FeatureCollection } from 'geojson';

export async function parseFile(file: File): Promise<FeatureCollection | null> {
    const fileName = file.name.toLowerCase();

    try {
        if (fileName.endsWith('.zip')) {
            // Assume Shapefile ZIP
            const buffer = await file.arrayBuffer();
            const geojson = await shp(buffer);
            // shpjs can return an array if multiple shapefiles are in the zip
            if (Array.isArray(geojson)) {
                // Merge or take the first one? Let's take the first one or merge features.
                // For simplicity, returning the first one that is a FeatureCollection
                return geojson[0] as FeatureCollection;
            }
            return geojson as FeatureCollection;
        } else if (fileName.endsWith('.kml')) {
            const text = await file.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            return toGeoJSON.kml(xml) as FeatureCollection;
        } else if (fileName.endsWith('.json') || fileName.endsWith('.geojson')) {
            const text = await file.text();
            return JSON.parse(text) as FeatureCollection;
        } else {
            console.warn('Unsupported file format:', fileName);
            throw new Error(`Unsupported file format: ${fileName}`);
        }
    } catch (error) {
        console.error('Error parsing file:', error);
        throw error;
    }
    return null;
}
