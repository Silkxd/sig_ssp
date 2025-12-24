import React, { useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { useMapStore } from '../store/useMapStore';
import { Legend } from './Legend';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Webpack/Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapController = () => {
    const map = useMap();
    const { layers } = useMapStore();
    const focusedLayerId = useMapStore(state => state.focusedLayerId);
    const focusedFeature = useMapStore(state => state.focusedFeature);

    // Invalidate size on mount/resize
    useEffect(() => {
        map.invalidateSize();
    }, [map]);

    // Zoom to layer when focusedLayerId changes
    useEffect(() => {
        if (!focusedLayerId) return;

        const layer = layers.find(l => l.id === focusedLayerId);
        if (layer && layer.data) {
            try {
                const geoJsonLayer = L.geoJSON(layer.data);
                const bounds = geoJsonLayer.getBounds();
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
                }
            } catch (e) {
                console.error("Error focusing on layer:", e);
            }
        }
    }, [focusedLayerId, layers, map]);

    // Zoom to feature when focusedFeature changes
    useEffect(() => {
        if (!focusedFeature) return;

        try {
            const geoJsonLayer = L.geoJSON(focusedFeature);
            const bounds = geoJsonLayer.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [100, 100], maxZoom: 18 });

                // Optional: Open popup if available
                // detailed implementation would require reference to the actual layer instance
            }
        } catch (e) {
            console.error("Error focusing on feature:", e);
        }
    }, [focusedFeature, map]);

    return null;
};

export const MapViewer: React.FC = () => {
    const { layers } = useMapStore();

    // Voyager theme (CartoDB)
    const tileUrl = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    const getFeatureStyle = (feature: any, layer: any) => {
        let fillColor = layer.color;

        if (layer.style?.type === 'categorized' && layer.style.field && layer.style.classMap) {
            const val = feature.properties?.[layer.style.field];
            // Handle 0, false, etc. correctly
            if (val !== undefined && val !== null) {
                const strVal = String(val);
                if (layer.style.classMap[strVal]) {
                    fillColor = layer.style.classMap[strVal];
                }
            }
        }

        return {
            color: layer.color, // Border color keeps the main color
            weight: 2,
            opacity: layer.opacity,
            fillColor: fillColor,
            fillOpacity: layer.opacity * 0.5, // slightly more opaque for filled polygons
        };
    };

    const onEachFeature = (feature: any, layer: L.Layer) => {
        if (feature.properties) {
            const props = Object.entries(feature.properties)
                .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                .join('<br/>');
            layer.bindPopup(props);
        }
    };

    return (
        <MapContainer
            center={[-15.7942, -47.8822]} // Brasilia default
            zoom={4}
            scrollWheelZoom={true}
            className="w-full h-full bg-slate-100"
        >
            <MapController />
            <Legend />
            <TileLayer
                attribution={attribution}
                url={tileUrl}
            />

            {layers.map((layer) => (
                layer.visible && layer.data && (
                    <GeoJSON
                        key={layer.id} // Important for updates
                        data={layer.data}
                        style={(feature) => getFeatureStyle(feature, layer)}
                        onEachFeature={onEachFeature}
                    />
                )
            ))}
        </MapContainer>
    );
};
