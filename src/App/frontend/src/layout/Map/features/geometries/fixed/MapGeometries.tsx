import React from 'react';
import { GeoJSON, Tooltip } from 'react-leaflet';

import { icon, marker } from 'leaflet';
import Icon from 'leaflet/dist/images/marker-icon.png';
import RetinaIcon from 'leaflet/dist/images/marker-icon-2x.png';
import IconShadow from 'leaflet/dist/images/marker-shadow.png';

import { useMapParsedGeometries } from 'src/layout/Map/features/geometries/fixed/hooks';

const markerIcon = icon({
  iconUrl: Icon,
  iconRetinaUrl: RetinaIcon,
  shadowUrl: IconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type MapGeometriesProps = {
  baseComponentId: string;
  readOnly: boolean;
};

export function MapGeometries({ baseComponentId, readOnly }: MapGeometriesProps) {
  const geometries = useMapParsedGeometries(baseComponentId);
  if (!geometries || geometries.length === 0) {
    return null;
  }

  return (
    <>
      {geometries.map(({ altinnRowId, data, label }) => (
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
              interactive={!readOnly}
              direction={data.type == 'Point' ? 'bottom' : 'top'}
              eventHandlers={{ click: (e) => e.originalEvent.preventDefault() }}
            />
          )}
        </GeoJSON>
      ))}
    </>
  );
}
