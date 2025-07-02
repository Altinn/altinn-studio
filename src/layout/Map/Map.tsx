import React, { useEffect, useMemo, useRef } from 'react';
import {
  AttributionControl,
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMapEvent,
  WMSTileLayer,
} from 'react-leaflet';

import cn from 'classnames';
import { icon, type Map as LeafletMap, marker } from 'leaflet';
import Icon from 'leaflet/dist/images/marker-icon.png';
import RetinaIcon from 'leaflet/dist/images/marker-icon-2x.png';
import IconShadow from 'leaflet/dist/images/marker-shadow.png';

import { useIsPdf } from 'src/hooks/useIsPdf';
import classes from 'src/layout/Map/MapComponent.module.css';
import {
  calculateBounds,
  DefaultBoundsPadding,
  DefaultFlyToZoomLevel,
  DefaultMapLayers,
  getMapStartingView,
  isLocationValid,
  locationToTuple,
  parseGeometries,
} from 'src/layout/Map/utils';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { Location } from 'src/layout/Map/config.generated';
import type { RawGeometry } from 'src/layout/Map/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

const markerIcon = icon({
  iconUrl: Icon,
  iconRetinaUrl: RetinaIcon,
  shadowUrl: IconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapClickHandler({ onClick }: { onClick: (location: Location) => void }) {
  useMapEvent('click', (event) => {
    if (!event.originalEvent.defaultPrevented) {
      const location = event.latlng.wrap();
      onClick({
        latitude: location.lat,
        longitude: location.lng,
      });
    }
  });

  return null;
}

type MapProps = {
  mapNode: LayoutNode<'Map'>;
  markerLocation?: Location;
  setMarkerLocation?: (location: Location) => void;
  geometries?: RawGeometry[];
  isSummary?: boolean;
  className?: string;
};

export function Map({
  mapNode,
  isSummary,
  markerLocation,
  setMarkerLocation,
  geometries: rawGeometries,
  className,
}: MapProps) {
  const map = useRef<LeafletMap | null>(null);

  const {
    readOnly,
    layers: customLayers,
    centerLocation: customCenterLocation,
    zoom: customZoom,
    geometryType,
  } = useItemWhenType(mapNode.baseId, 'Map');

  const isPdf = useIsPdf();
  const isInteractive = !readOnly && !isSummary;
  const layers = customLayers ?? DefaultMapLayers;
  const markerLocationIsValid = isLocationValid(markerLocation);

  const geometries = useMemo(() => {
    try {
      const geometries = parseGeometries(rawGeometries, geometryType);
      return geometries;
    } catch {
      throw new Error(
        `Failed to parse geometry data as ${geometryType}:\n- ${rawGeometries?.map((g) => JSON.stringify(g)).join('\n- ')}`,
      );
    }
  }, [geometryType, rawGeometries]);

  const geometryBounds = useMemo(() => calculateBounds(geometries), [geometries]);

  const { center, zoom, bounds } = getMapStartingView(markerLocation, customCenterLocation, customZoom, geometryBounds);

  useEffect(() => {
    if (markerLocationIsValid) {
      map.current?.flyTo({ lat: markerLocation.latitude, lng: markerLocation.longitude }, DefaultFlyToZoomLevel, {
        animate: !isSummary,
      });
    }
  }, [isSummary, markerLocationIsValid, markerLocation]);

  useEffect(() => {
    if (bounds) {
      map.current?.fitBounds(bounds, { padding: DefaultBoundsPadding, animate: !isSummary });
    }
  }, [bounds, isSummary]);

  return (
    <MapContainer
      ref={map}
      className={cn(classes.map, { [classes.mapReadOnly]: !isInteractive, [classes.print]: isPdf }, className)}
      center={center}
      zoom={zoom}
      bounds={bounds}
      boundsOptions={{ padding: DefaultBoundsPadding, maxZoom: DefaultFlyToZoomLevel }}
      minZoom={3}
      maxBounds={[
        [-90, -200],
        [90, 200],
      ]}
      fadeAnimation={isInteractive}
      zoomControl={isInteractive}
      dragging={isInteractive}
      touchZoom={isInteractive}
      doubleClickZoom={isInteractive}
      scrollWheelZoom={isInteractive}
      attributionControl={false}
    >
      {setMarkerLocation && isInteractive && <MapClickHandler onClick={setMarkerLocation} />}
      {layers.map((layer, i) =>
        layer.type === 'WMS' ? (
          <WMSTileLayer
            key={i}
            url={layer.url}
            attribution={layer.attribution}
            subdomains={layer.subdomains ? layer.subdomains : []}
            layers={layer.layers}
            format={layer.format ?? 'image/jpeg'}
            version={layer.version ?? '1.1.1'}
            transparent={layer.transparent ?? false}
            uppercase={layer.uppercase ?? false}
            minZoom={layer.minZoom ?? 0}
            maxZoom={layer.maxZoom ?? 18}
          />
        ) : (
          <TileLayer
            key={i}
            url={layer.url}
            attribution={layer.attribution}
            subdomains={layer.subdomains ? layer.subdomains : []}
            minZoom={layer.minZoom ?? 0}
            maxZoom={layer.maxZoom ?? 18}
          />
        ),
      )}
      {geometries?.map(({ altinnRowId, data, label }) => (
        <GeoJSON
          key={altinnRowId}
          data={data}
          interactive={false}
          pointToLayer={(_, position) =>
            marker(position, { icon: markerIcon, interactive: false, draggable: false, keyboard: false })
          }
        >
          {label && (
            <Tooltip
              permanent={true}
              content={label}
              interactive={isInteractive}
              direction={data.type == 'Point' ? 'bottom' : 'top'}
              eventHandlers={{
                click: (e) => e.originalEvent.preventDefault(),
              }}
            />
          )}
        </GeoJSON>
      ))}
      {markerLocationIsValid ? (
        <Marker
          position={locationToTuple(markerLocation)}
          icon={markerIcon}
          eventHandlers={
            isInteractive && setMarkerLocation
              ? {
                  click: () => {},
                  dragend: (e) => {
                    const { lat, lng } = e.target._latlng;
                    setMarkerLocation({ latitude: lat, longitude: lng });
                  },
                }
              : undefined
          }
          interactive={isInteractive}
          draggable={isInteractive}
          keyboard={isInteractive}
        />
      ) : null}
      <AttributionControl prefix={false} />
    </MapContainer>
  );
}
