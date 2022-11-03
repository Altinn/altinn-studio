import React from 'react';

import { Map } from '@altinn/altinn-design-system';
import { makeStyles, Typography } from '@material-ui/core';
import type { Location } from '@altinn/altinn-design-system';

import type { PropsFromGenericComponent } from 'src/components';

import { getLanguageFromKey, getParsedLanguageFromKey } from 'altinn-shared/utils';

export type IMapComponentProps = PropsFromGenericComponent<'Map'>;

export const useStyles = makeStyles(() => ({
  footer: {
    paddingTop: '12px',
  },
}));

export function MapComponent({
  formData,
  handleDataChange,
  language,
  isValid,
  readOnly,
  layers,
  centerLocation,
  zoom,
}: IMapComponentProps) {
  const classes = useStyles();
  const location = formData.simpleBinding ? parseLocation(formData.simpleBinding) : undefined;

  const footerText = location
    ? getParsedLanguageFromKey('map_component.selectedLocation', language, [location.latitude, location.longitude])
    : getLanguageFromKey('map_component.noSelectedLocation', language);

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
      />
      <Typography className={classes.footer}>{footerText}</Typography>
    </div>
  );
}

export function parseLocation(locationString: string): Location | undefined {
  const latLonArray = locationString.split(',');
  if (latLonArray.length != 2) {
    console.error(`Invalid location string: ${locationString}`);
    return undefined;
  }
  const latString = latLonArray[0];
  const lonString = latLonArray[1];
  const lat = parseFloat(latString);
  const lon = parseFloat(lonString);
  if (isNaN(lat) || isNaN(lon)) {
    console.error(`Invalid location string: ${locationString}`);
    return undefined;
  }
  return {
    latitude: lat,
    longitude: lon,
  } as Location;
}
