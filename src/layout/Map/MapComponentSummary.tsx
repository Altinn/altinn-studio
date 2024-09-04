import React from 'react';

import { Typography } from '@material-ui/core';

import { Lang } from 'src/features/language/Lang';
import { Map } from 'src/layout/Map/Map';
import classes from 'src/layout/Map/MapComponent.module.css';
import { isLocationValid, parseLocation } from 'src/layout/Map/utils';
import { useNodeFormData, useNodeItem } from 'src/utils/layout/useNodeItem';
import type { RawGeometry } from 'src/layout/Map/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface IMapComponentSummary {
  targetNode: LayoutNode<'Map'>;
}

export function MapComponentSummary({ targetNode }: IMapComponentSummary) {
  const markerBinding = useNodeItem(targetNode, (item) => item.dataModelBindings.simpleBinding);
  const formData = useNodeFormData(targetNode);
  const markerLocation = parseLocation(formData.simpleBinding);
  const markerLocationIsValid = isLocationValid(markerLocation);
  const geometries = formData.geometries as RawGeometry[] | undefined;

  if (markerBinding && !markerLocationIsValid) {
    return (
      <Typography
        variant='body1'
        className={classes.emptyField}
      >
        <Lang id={'general.empty_summary'} />
      </Typography>
    );
  }

  return (
    <>
      <Map
        mapNode={targetNode}
        markerLocation={markerLocation}
        geometries={geometries}
        isSummary={true}
      />
      {markerLocation && (
        <Typography className={classes.footer}>
          <Lang
            id={'map_component.selectedLocation'}
            params={[markerLocation.latitude, markerLocation.longitude]}
          />
        </Typography>
      )}
    </>
  );
}
