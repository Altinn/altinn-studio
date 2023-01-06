import React, { useState } from 'react';
import { Map, Location, FieldSet } from '@altinn/altinn-design-system';
import type { IGenericEditComponent } from '../../componentConfig';

export interface MapComponentProps extends IGenericEditComponent {}
export const MapComponent = ({
  component,
  handleComponentChange
}: MapComponentProps): JSX.Element => {
  const [location, setLocation] = useState<Location | undefined>(component.markerLocation);

  const handleMarkerLocation = (location: Location): void => {
    setLocation(location);
    handleComponentChange({ ...component, markerLocation: location });
  };

  return (
    <FieldSet>
      <Map onClick={handleMarkerLocation} key={component.id} markerLocation={location} />
    </FieldSet>
  );
};
