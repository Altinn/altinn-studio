import React from 'react';

import { Map } from '@altinn/altinn-design-system';
import { makeStyles, Typography } from '@material-ui/core';
import type { Location } from '@altinn/altinn-design-system';

import { Lang } from 'src/features/language/Lang';
import { markerIcon } from 'src/layout/Map/MapIcons';
import type { PropsFromGenericComponent } from 'src/layout';

export type IMapComponentProps = PropsFromGenericComponent<'Map'>;

export const useStyles = makeStyles(() => ({
  footer: {
    paddingTop: '12px',
  },
}));

export function MapComponent({ formData, handleDataChange, isValid, node }: IMapComponentProps) {
  const { readOnly, layers, centerLocation, zoom } = node.item;
  const classes = useStyles();
  const location = parseLocation(formData.simpleBinding);

  const handleMapClicked = ({ latitude, longitude }: Location) => {
    const fractionDigits = 6;
    handleDataChange(`${latitude.toFixed(fractionDigits)},${longitude.toFixed(fractionDigits)}`);
  };

  return (
    <div className={`map-component${isValid ? '' : ' validation-error'}`}>
      <Map
        layers={layers}
        centerLocation={location || centerLocation}
        zoom={location ? 16 : zoom}
        markerLocation={location}
        readOnly={readOnly}
        onClick={handleMapClicked}
        markerIcon={markerIcon}
      />
      <Typography className={classes.footer}>
        {location ? (
          <Lang
            id={'map_component.selectedLocation'}
            params={[location.latitude, location.longitude]}
          />
        ) : (
          <Lang id={'map_component.noSelectedLocation'} />
        )}
      </Typography>
    </div>
  );
}

export function parseLocation(locationString: string | undefined): Location | undefined {
  if (!locationString) {
    return undefined;
  }
  const latLonArray = locationString.split(',');
  if (latLonArray.length != 2) {
    window.logErrorOnce(`Invalid location string: ${locationString}`);
    return undefined;
  }
  const latString = latLonArray[0];
  const lonString = latLonArray[1];
  const lat = parseFloat(latString);
  const lon = parseFloat(lonString);
  if (isNaN(lat) || isNaN(lon)) {
    window.logErrorOnce(`Invalid location string: ${locationString}`);
    return undefined;
  }
  return {
    latitude: lat,
    longitude: lon,
  } as Location;
}
