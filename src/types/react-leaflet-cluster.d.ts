declare module 'react-leaflet-cluster' {
    import { PropsWithChildren } from 'react';
    import { LayerGroupProps } from 'react-leaflet';
    import L from 'leaflet';

    interface MarkerClusterGroupProps extends LayerGroupProps {
        chunkedLoading?: boolean;
        maxClusterRadius?: number | ((zoom: number) => number);
        spiderfyOnMaxZoom?: boolean;
        showCoverageOnHover?: boolean;
        zoomToBoundsOnClick?: boolean;
        disableClusteringAtZoom?: number;
        removeOutsideVisibleBounds?: boolean;
        animate?: boolean;
        animateAddingMarkers?: boolean;
        spiderfyDistanceMultiplier?: number;
        polygonOptions?: L.PolylineOptions;
        iconCreateFunction?: (cluster: L.MarkerCluster) => L.DivIcon;
    }

    const MarkerClusterGroup: React.FC<PropsWithChildren<MarkerClusterGroupProps>>;
    export default MarkerClusterGroup;
}
