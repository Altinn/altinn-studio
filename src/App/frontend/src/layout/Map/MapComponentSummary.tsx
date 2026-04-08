import React from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { Lang } from 'src/features/language/Lang';
import { MarkerLocationText } from 'src/layout/Map/features/singleMarker/MarkerLocationText';
import { Map } from 'src/layout/Map/Map';
import classes from 'src/layout/Map/MapComponent.module.css';
import { isLocationValid, parseLocation } from 'src/layout/Map/utils';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

export function MapComponentSummary({ targetBaseComponentId }: SummaryRendererProps) {
  const markerBinding = useDataModelBindingsFor(targetBaseComponentId, 'Map').simpleBinding;
  const formData = FormStore.data.useDebouncedPick(markerBinding);
  const markerLocation = typeof formData === 'string' ? parseLocation(formData) : undefined;
  const markerLocationIsValid = isLocationValid(markerLocation);

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
        readOnly={true}
        animate={false}
      />
      {markerBinding && <MarkerLocationText baseComponentId={targetBaseComponentId} />}
    </>
  );
}
