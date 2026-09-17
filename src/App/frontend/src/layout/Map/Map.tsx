import React, { useEffect, useRef } from 'react';
import { MapContainer, ZoomControl } from 'react-leaflet';
import type { RefObject } from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import cn from 'classnames';
import { type Map as LeafletMap } from 'leaflet';

import { useLanguage } from 'src/features/language/useLanguage';
import { useIsPdf } from 'src/hooks/useIsPdf';
import { MapRegionA11y } from 'src/layout/Map/features/a11y/MapRegionA11y';
import { MapEditGeometries } from 'src/layout/Map/features/geometries/editable/MapEditGeometries';
import { useMapGeometryBounds } from 'src/layout/Map/features/geometries/fixed/hooks';
import { MapGeometries } from 'src/layout/Map/features/geometries/fixed/MapGeometries';
import { MapLayers } from 'src/layout/Map/features/layers/MapLayers';
import { useSingleMarker } from 'src/layout/Map/features/singleMarker/hooks';
import { MapSingleMarker } from 'src/layout/Map/features/singleMarker/MapSingleMarker';
import classes from 'src/layout/Map/MapComponent.module.css';
import { DefaultBoundsPadding, DefaultFlyToZoomLevel, getMapStartingView, isLocationValid } from 'src/layout/Map/utils';
import utilClasses from 'src/styles/utils.module.css';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';

type MapProps = {
  baseComponentId: string;
  readOnly: boolean;
  animate?: boolean;
  className?: string;
};

export function Map({ baseComponentId, className, readOnly, animate = true }: MapProps) {
  const map = useRef<LeafletMap | null>(null);
  const isPdf = useIsPdf();
  const { langAsString } = useLanguage();
  const { center, zoom, bounds } = useAutoViewport(baseComponentId, map, animate);
  const config = useComponentConfig(baseComponentId, 'Map');
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'Map');
  const simpleBinding = dataModelBindings?.simpleBinding;

  return (
    <MapContainer
      ref={map}
      className={cn(
        classes.map,
        utilClasses.focusable,
        { [classes.mapReadOnly]: readOnly, [classes.print]: isPdf },
        className,
      )}
      center={center}
      zoom={zoom}
      bounds={bounds}
      boundsOptions={{ padding: DefaultBoundsPadding, maxZoom: DefaultFlyToZoomLevel }}
      minZoom={3}
      maxBounds={[
        [-90, -200],
        [90, 200],
      ]}
      fadeAnimation={animate}
      zoomControl={false}
      dragging={!readOnly}
      touchZoom={!readOnly}
      doubleClickZoom={!readOnly}
      scrollWheelZoom={!readOnly}
      attributionControl={false}
    >
      <MapRegionA11y baseComponentId={baseComponentId} />
      {!readOnly && (
        <ZoomControl
          position='topleft'
          zoomInTitle={langAsString('map_component.zoomIn')}
          zoomOutTitle={langAsString('map_component.zoomOut')}
        />
      )}
      {config.toolbar !== undefined && !readOnly && <MapEditGeometries baseComponentId={baseComponentId} />}
      <MapLayers baseComponentId={baseComponentId} />
      <MapGeometries
        baseComponentId={baseComponentId}
        readOnly={readOnly}
      />
      {config.toolbar === undefined && simpleBinding && (
        <MapSingleMarker
          baseComponentId={baseComponentId}
          readOnly={readOnly}
        />
      )}
    </MapContainer>
  );
}

function useAutoViewport(baseComponentId: string, map: RefObject<LeafletMap | null>, animate: boolean) {
  const markerLocation = useSingleMarker(baseComponentId);
  const config = useComponentConfig(baseComponentId, 'Map');
  const latitude = useEvalExpression(config.centerLocation?.latitude, Expressions.Map.centerLocation.latitude);
  const longitude = useEvalExpression(config.centerLocation?.longitude, Expressions.Map.centerLocation.longitude);
  const resolvedCenterLocation = config.centerLocation ? { latitude, longitude } : undefined;
  const geometryBounds = useMapGeometryBounds(baseComponentId);
  const { center, zoom, bounds } = getMapStartingView(
    markerLocation,
    resolvedCenterLocation,
    config.zoom,
    geometryBounds,
  );

  useEffect(() => {
    if (isLocationValid(markerLocation)) {
      map.current?.flyTo({ lat: markerLocation.latitude, lng: markerLocation.longitude }, DefaultFlyToZoomLevel, {
        animate,
      });
    }
  }, [animate, markerLocation, map]);

  useEffect(() => {
    if (bounds) {
      map.current?.fitBounds(bounds, { padding: DefaultBoundsPadding, animate });
    }
  }, [animate, bounds, map]);

  return { center, zoom, bounds };
}
