import React, { useCallback } from 'react';

import { Paragraph } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { DEFAULT_DEBOUNCE_TIMEOUT } from 'src/features/formData/types';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { Map } from 'src/layout/Map/Map';
import classes from 'src/layout/Map/MapComponent.module.css';
import { isLocationValid, parseLocation } from 'src/layout/Map/utils';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type { Location } from 'src/layout/Map/config.generated';
import type { RawGeometry } from 'src/layout/Map/types';

export type IMapComponentProps = PropsFromGenericComponent<'Map'>;

export function MapComponent({ node }: IMapComponentProps) {
  const isValid = useIsValid(node);
  const dataModelBindings = useNodeItem(node, (item) => item.dataModelBindings);
  const markerBinding = dataModelBindings.simpleBinding;

  const { formData, setValue } = useDataModelBindings(dataModelBindings, DEFAULT_DEBOUNCE_TIMEOUT, 'raw');

  const markerLocation = parseLocation(formData.simpleBinding as string | undefined);
  const markerLocationIsValid = isLocationValid(markerLocation);

  const geometries = formData.geometries as RawGeometry[] | undefined;

  const setMarkerLocation = useCallback(
    ({ latitude, longitude }: Location) => {
      const d = 6;
      setValue('simpleBinding', `${latitude.toFixed(d)},${longitude.toFixed(d)}`);
    },
    [setValue],
  );

  return (
    <ComponentStructureWrapper
      node={node}
      label={{
        node,
        renderLabelAs: 'span',
        className: classes.label,
      }}
    >
      <div
        data-testid={`map-container-${node.id}`}
        className={cn({ [classes.mapError]: !isValid })}
      >
        <Map
          mapNode={node}
          markerLocation={markerLocation}
          setMarkerLocation={markerBinding ? setMarkerLocation : undefined}
          geometries={geometries}
        />
      </div>
      <Paragraph
        data-size='sm'
        className={classes.footer}
      >
        {markerBinding ? (
          markerLocationIsValid ? (
            <Lang
              id='map_component.selectedLocation'
              params={[markerLocation.latitude, markerLocation.longitude]}
            />
          ) : (
            <Lang id='map_component.noSelectedLocation' />
          )
        ) : null}
      </Paragraph>
    </ComponentStructureWrapper>
  );
}
