import React from 'react';

import { Map } from '@altinn/altinn-design-system';
import { Grid, makeStyles, Typography } from '@material-ui/core';

import { useLanguage } from 'src/hooks/useLanguage';
import { parseLocation } from 'src/layout/Map/MapComponent';
import { markerIcon } from 'src/layout/Map/MapIcons';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

export interface IMapComponentSummary {
  targetNode: LayoutNodeFromType<'Map'>;
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
    lineHeight: 1.6875,
  },
}));

export function MapComponentSummary({ targetNode }: IMapComponentSummary) {
  const classes = useStyles();
  const layers = targetNode.item.layers;
  const formData = targetNode.def.useDisplayData(targetNode);
  const location = formData ? parseLocation(formData) : undefined;
  const { lang } = useLanguage();

  const footerText = location ? lang('map_component.selectedLocation', [location.latitude, location.longitude]) : null;

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
          {lang('general.empty_summary')}
        </Typography>
      )}
    </Grid>
  );
}
