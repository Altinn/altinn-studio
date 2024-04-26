import React from 'react';

import { Map } from '@altinn/altinn-design-system';
import { Grid, makeStyles, Typography } from '@material-ui/core';

import { Lang } from 'src/features/language/Lang';
import { parseLocation } from 'src/layout/Map/MapComponent';
import { markerIcon } from 'src/layout/Map/MapIcons';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface IMapComponentSummary {
  targetNode: LayoutNode<'Map'>;
}

export const useStyles = makeStyles(() => ({
  mapContainer: {
    marginTop: 12,
    // The marker has role=button, and will therefore be hidden from PDF by default
    // This makes sure it is visible after all
    '& img.leaflet-marker-icon': {
      display: 'block !important',
    },
    // The tiles fade in from opacity 0, meaning that they are not fully visible in PDF when print is called
    // This overrides the opacity so that the tiles are visible immediately
    '& img.leaflet-tile': {
      opacity: '1 !important',
    },
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
  const location = parseLocation(formData);

  return (
    <Grid
      item
      xs={12}
      className={location ? classes.mapContainer : undefined}
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
          <Typography className={classes.footer}>
            {location && (
              <Lang
                id={'map_component.selectedLocation'}
                params={[location.latitude, location.longitude]}
              />
            )}
          </Typography>
        </>
      ) : (
        <Typography
          variant='body1'
          className={classes.emptyField}
        >
          <Lang id={'general.empty_summary'} />
        </Typography>
      )}
    </Grid>
  );
}
