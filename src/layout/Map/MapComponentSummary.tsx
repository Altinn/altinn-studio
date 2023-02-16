import React from 'react';

import { Map } from '@altinn/altinn-design-system';
import { Grid, makeStyles, Typography } from '@material-ui/core';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { getLanguageFromKey, getParsedLanguageFromKey } from 'src/language/sharedLanguage';
import { parseLocation } from 'src/layout/Map/MapComponent';
import { markerIcon } from 'src/layout/Map/MapIcons';
import type { ILayoutCompMap } from 'src/layout/Map/types';

export interface IMapComponentSummary {
  component: ILayoutCompMap;
  formData: any;
}

export const useStyles = makeStyles(() => ({
  mapMargin: {
    marginTop: 12,
  },
  footer: {
    paddingTop: '12px',
  },
  emptyField: {
    fontStyle: 'italic',
    fontSize: '1rem',
  },
}));

export function MapComponentSummary({ component, formData }: IMapComponentSummary) {
  const classes = useStyles();
  const layers = component.layers;
  const location = formData ? parseLocation(formData) : undefined;
  const language = useAppSelector((state) => state.language.language);
  if (!language) {
    return null;
  }

  const footerText = location
    ? getParsedLanguageFromKey('map_component.selectedLocation', language, [location.latitude, location.longitude])
    : null;

  return (
    <Grid
      item
      xs={12}
      className={location ? classes.mapMargin : undefined}
    >
      {location ? (
        <>
          <Map
            readOnly={true}
            layers={layers}
            centerLocation={location}
            zoom={16}
            markerLocation={location}
            markerIcon={markerIcon}
          />
          <Typography className={classes.footer}>{footerText}</Typography>
        </>
      ) : (
        <Typography
          variant='body1'
          className={classes.emptyField}
        >
          {getLanguageFromKey('general.empty_summary', language || {})}
        </Typography>
      )}
    </Grid>
  );
}
