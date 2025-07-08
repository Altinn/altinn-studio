import React from 'react';

import { Paragraph } from '@digdir/designsystemet-react';

import { Lang } from 'src/features/language/Lang';
import { Map } from 'src/layout/Map/Map';
import classes from 'src/layout/Map/MapComponent.module.css';
import { isLocationValid, parseLocation } from 'src/layout/Map/utils';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useFormDataFor } from 'src/utils/layout/useNodeItem';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { RawGeometry } from 'src/layout/Map/types';

export function MapComponentSummary({ targetBaseComponentId }: SummaryRendererProps) {
  const markerBinding = useDataModelBindingsFor(targetBaseComponentId, 'Map').simpleBinding;
  const formData = useFormDataFor<'Map'>(targetBaseComponentId);
  const markerLocation = parseLocation(formData.simpleBinding);
  const markerLocationIsValid = isLocationValid(markerLocation);
  const geometries = formData.geometries as RawGeometry[] | undefined;

  if (markerBinding && !markerLocationIsValid) {
    return (
      <span className={classes.emptyField}>
        <Lang id='general.empty_summary' />
      </span>
    );
  }

  return (
    <>
      <Map
        baseComponentId={targetBaseComponentId}
        markerLocation={markerLocation}
        geometries={geometries}
        isSummary={true}
      />
      {markerLocation && (
        <Paragraph className={classes.footer}>
          <Lang
            id='map_component.selectedLocation'
            params={[markerLocation.latitude, markerLocation.longitude]}
          />
        </Paragraph>
      )}
    </>
  );
}
