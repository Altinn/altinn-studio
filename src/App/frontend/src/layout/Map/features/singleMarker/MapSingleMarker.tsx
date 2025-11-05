import React, { useCallback } from 'react';
import { Marker, useMapEvent } from 'react-leaflet';

import { icon } from 'leaflet';
import Icon from 'leaflet/dist/images/marker-icon.png';
import RetinaIcon from 'leaflet/dist/images/marker-icon-2x.png';
import IconShadow from 'leaflet/dist/images/marker-shadow.png';

import { FD } from 'src/features/formData/FormDataWrite';
import { useSingleMarker } from 'src/layout/Map/features/singleMarker/hooks';
import { isLocationValid, locationToTuple } from 'src/layout/Map/utils';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';
import type { Location } from 'src/layout/Map/config.generated';

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
      onClick({ latitude: location.lat, longitude: location.lng });
    }
  });

  return null;
}

type MapMarkerProps = {
  baseComponentId: string;
  readOnly: boolean;
};

export function MapSingleMarker({ baseComponentId, readOnly }: MapMarkerProps) {
  const markerLocation = useSingleMarker(baseComponentId);
  const markerLocationIsValid = isLocationValid(markerLocation);
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'Map');
  const setLeafValue = FD.useSetLeafValue();

  const setMarkerLocation = useCallback(
    ({ latitude, longitude }: Location) => {
      const binding = dataModelBindings?.simpleBinding;
      if (!binding) {
        throw new Error(`No binding found for Map component ${baseComponentId}`);
      }

      const d = 6;
      const location = `${latitude.toFixed(d)},${longitude.toFixed(d)}`;
      setLeafValue({
        reference: binding,
        newValue: location,
      });
    },
    [baseComponentId, dataModelBindings?.simpleBinding, setLeafValue],
  );

  return (
    <>
      {!readOnly && <MapClickHandler onClick={setMarkerLocation} />}
      {markerLocationIsValid ? (
        <Marker
          position={locationToTuple(markerLocation)}
          icon={markerIcon}
          eventHandlers={
            !readOnly
              ? {
                  click: () => {},
                  dragend: (e) => {
                    const { lat, lng } = e.target._latlng;
                    setMarkerLocation({ latitude: lat, longitude: lng });
                  },
                }
              : undefined
          }
          interactive={!readOnly}
          draggable={!readOnly}
          keyboard={!readOnly}
        />
      ) : null}
    </>
  );
}
