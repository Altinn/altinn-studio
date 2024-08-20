import React from 'react';

import { Map } from '@altinn/altinn-design-system';
import { makeStyles, Typography } from '@material-ui/core';
import type { Location } from '@altinn/altinn-design-system';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { markerIcon } from 'src/layout/Map/MapIcons';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export type IMapComponentProps = PropsFromGenericComponent<'Map'>;

export const useStyles = makeStyles(() => ({
  footer: {
    paddingTop: '12px',
  },
  container: {
    width: '100%',
  },
}));

export function MapComponent({ node }: IMapComponentProps) {
  const { readOnly, layers, centerLocation, zoom, dataModelBindings } = useNodeItem(node);
  const isValid = useIsValid(node);
  const classes = useStyles();
  const { formData, setValue } = useDataModelBindings(dataModelBindings);
  const value = 'simpleBinding' in formData ? formData.simpleBinding : undefined;
  const location = parseLocation(value);

  const handleMapClicked = ({ latitude, longitude }: Location) => {
    const fractionDigits = 6;
    setValue('simpleBinding', `${latitude.toFixed(fractionDigits)},${longitude.toFixed(fractionDigits)}`);
  };

  return (
    <ComponentStructureWrapper
      node={node}
      label={{
        node,
        renderLabelAs: 'span',
        className: classes.container,
      }}
    >
      <div className={`map-component${isValid ? '' : ' validation-error'}`}>
        <Map
          layers={layers}
          centerLocation={location ?? centerLocation}
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
    </ComponentStructureWrapper>
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
