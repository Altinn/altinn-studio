import React from 'react';

import { Paragraph } from '@digdir/designsystemet-react';

import { Lang } from 'src/features/language/Lang';
import { useSingleMarker } from 'src/layout/Map/features/singleMarker/hooks';
import classes from 'src/layout/Map/MapComponent.module.css';
import { isLocationValid } from 'src/layout/Map/utils';

export function MarkerLocationText({ baseComponentId }: { baseComponentId: string }) {
  const location = useSingleMarker(baseComponentId);

  return (
    <Paragraph
      data-size='sm'
      className={classes.footer}
    >
      {isLocationValid(location) ? (
        <Lang
          id='map_component.selectedLocation'
          params={[location.latitude, location.longitude]}
        />
      ) : (
        <Lang id='map_component.noSelectedLocation' />
      )}
    </Paragraph>
  );
}
