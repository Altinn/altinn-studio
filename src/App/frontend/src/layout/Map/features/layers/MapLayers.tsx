import React from 'react';
import { TileLayer, WMSTileLayer } from 'react-leaflet';

import { DefaultMapLayers } from 'src/layout/Map/utils';
import { useExternalItem } from 'src/utils/layout/hooks';
import type { MapTileLayer, MapWMSLayer } from 'src/layout/Map/config.generated';

function OurTileLayer({ layer }: { layer: MapTileLayer }) {
  return (
    <TileLayer
      url={layer.url}
      attribution={layer.attribution}
      subdomains={layer.subdomains ?? []}
      minZoom={layer.minZoom ?? 0}
      maxZoom={layer.maxZoom ?? 18}
    />
  );
}

function OurWMSLayer({ layer }: { layer: MapWMSLayer }) {
  return (
    <WMSTileLayer
      url={layer.url}
      attribution={layer.attribution}
      subdomains={layer.subdomains ?? []}
      layers={layer.layers}
      format={layer.format ?? 'image/jpeg'}
      version={layer.version ?? '1.1.1'}
      transparent={layer.transparent ?? false}
      uppercase={layer.uppercase ?? false}
      minZoom={layer.minZoom ?? 0}
      maxZoom={layer.maxZoom ?? 18}
    />
  );
}

interface MapLayersProps {
  baseComponentId: string;
}

export function MapLayers({ baseComponentId }: MapLayersProps) {
  const customLayers = useExternalItem(baseComponentId, 'Map').layers;
  const layers = customLayers ?? DefaultMapLayers;

  return (
    <>
      {layers.map((layer, i) =>
        layer.type === 'WMS' ? (
          <OurWMSLayer
            key={i}
            layer={layer}
          />
        ) : (
          <OurTileLayer
            key={i}
            layer={layer}
          />
        ),
      )}
    </>
  );
}
