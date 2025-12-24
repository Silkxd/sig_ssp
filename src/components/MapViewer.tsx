import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useMapStore } from '../store/useMapStore';
import { Legend } from './Legend';
import 'leaflet/dist/leaflet.css';
// Leaflet MarkerCluster CSS (Note: these files might need to be resolved from node_modules)
// Usually bundled with the library or we need to simple add styles if they are missing.
// Trying standard imports for leaflet.markercluster if installed as dependency of react-leaflet-cluster.
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
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

// Helper to create custom colored icons
const createCustomIcon = (color: string) => {
    return L.divIcon({
        className: 'custom-marker-icon',
        html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
    });
};

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
                // For bounds, we still use L.geoJSON interpretation
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
            if (val !== undefined && val !== null) {
                const strVal = String(val);
                if (layer.style.classMap[strVal]) {
                    fillColor = layer.style.classMap[strVal];
                }
            }
        }

        return {
            color: layer.color, // Border color
            weight: 2,
            opacity: layer.opacity,
            fillColor: fillColor,
            fillOpacity: layer.opacity * 0.5,
        };
    };

    const getPointColor = (feature: any, layer: any) => {
        let color = layer.color;
        if (layer.style?.type === 'categorized' && layer.style.field && layer.style.classMap) {
            const val = feature.properties?.[layer.style.field];
            if (val !== undefined && val !== null) {
                const strVal = String(val);
                if (layer.style.classMap[strVal]) {
                    color = layer.style.classMap[strVal];
                }
            }
        }
        return color;
    };

    const onEachFeature = (feature: any, layer: L.Layer) => {
        if (feature.properties) {
            const props = Object.entries(feature.properties)
                .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                .join('<br/>');
            layer.bindPopup(props);
        }
    };

    // Split layers into points (for clustering) and others (lines/polygons)
    const { pointLayers, otherLayers } = useMemo(() => {
        const pointLayers: any[] = [];
        const otherLayers: any[] = [];

        layers.forEach(layer => {
            if (!layer.visible || !layer.data) return;

            // Simple heuristic check: if the first feature is a Point, treat whole layer as points
            // ideally we should filter features inside the layer, but for simplicity we assume homogeneous layers usually
            const isPoint = layer.data.features.some(f => f.geometry.type === 'Point' || f.geometry.type === 'MultiPoint');

            if (isPoint) {
                pointLayers.push(layer);
            } else {
                otherLayers.push(layer);
            }
        });

        return { pointLayers, otherLayers };
    }, [layers]);

    return (
        <MapContainer
            center={[-15.7942, -47.8822]} // Brasilia default
            zoom={4}
            scrollWheelZoom={true}
            className="w-full h-full bg-slate-100"
        >
            <MapController />
            <Legend />
            <TileLayer attribution={attribution} url={tileUrl} />

            {/* Render non-point layers normally */}
            {otherLayers.map((layer) => (
                <GeoJSON
                    key={layer.id}
                    data={layer.data}
                    style={(feature) => getFeatureStyle(feature, layer)}
                    onEachFeature={onEachFeature}
                />
            ))}

            {/* Render point layers with clustering */}
            {pointLayers.length > 0 && (
                <MarkerClusterGroup
                    chunkedLoading
                    maxClusterRadius={60}
                    spiderfyOnMaxZoom={true}
                >
                    {pointLayers.map(layer => (
                        layer.data.features.map((feature: any, index: number) => {
                            if (feature.geometry.type !== 'Point') return null;

                            // Extract coordinates
                            const [lng, lat] = feature.geometry.coordinates;
                            const color = getPointColor(feature, layer);

                            return (
                                <Marker
                                    key={`${layer.id}-${index}`}
                                    position={[lat, lng]}
                                    icon={createCustomIcon(color)}
                                >
                                    <Popup>
                                        <div dangerouslySetInnerHTML={{
                                            __html: Object.entries(feature.properties || {})
                                                .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                                                .join('<br/>')
                                        }} />
                                    </Popup>
                                </Marker>
                            );
                        })
                    ))}
                </MarkerClusterGroup>
            )}
        </MapContainer>
    );
};

