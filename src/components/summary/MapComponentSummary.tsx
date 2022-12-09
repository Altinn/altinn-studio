import React from 'react';

import { Map } from '@altinn/altinn-design-system';
import { Typography } from '@material-ui/core';

import { useAppSelector } from 'src/common/hooks';
import { parseLocation, useStyles } from 'src/components/base/MapComponent';
import type { ILayoutCompMap } from 'src/features/form/layout';

import { getLanguageFromKey, getParsedLanguageFromKey } from 'src/utils/sharedUtils';

export interface IMapComponentSummary {
  component: ILayoutCompMap;
  formData: any;
}

function MapComponentSummary({ component, formData }: IMapComponentSummary) {
  const classes = useStyles();
  const layers = component.layers;
  const location = formData ? parseLocation(formData) : undefined;
  const language = useAppSelector((state) => state.language.language);
  if (!language) {
    return null;
  }

  const footerText = location
    ? getParsedLanguageFromKey('map_component.selectedLocation', language, [location.latitude, location.longitude])
    : getLanguageFromKey('map_component.noSelectedLocation', language);

  return (
    <>
      {location && (
        <Map
          readOnly={true}
          layers={layers}
          centerLocation={location}
          zoom={16}
          markerLocation={location}
        />
      )}
      <Typography className={classes.footer}>{footerText}</Typography>
    </>
  );
}

export default MapComponentSummary;
