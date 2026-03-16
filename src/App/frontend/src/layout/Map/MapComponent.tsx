import React from 'react';

import cn from 'classnames';

import { useIsValid } from 'src/features/validation/selectors/isValid';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { MarkerLocationText } from 'src/layout/Map/features/singleMarker/MarkerLocationText';
import { Map } from 'src/layout/Map/Map';
import classes from 'src/layout/Map/MapComponent.module.css';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function MapComponent({ baseComponentId }: PropsFromGenericComponent<'Map'>) {
  const isValid = useIsValid(baseComponentId);
  const { readOnly, dataModelBindings } = useItemWhenType(baseComponentId, 'Map');
  const indexedId = useIndexedId(baseComponentId);

  return (
    <ComponentStructureWrapper
      baseComponentId={baseComponentId}
      label={{
        baseComponentId,
        renderLabelAs: 'span',
        className: classes.label,
      }}
    >
      <div
        data-testid={`map-container-${indexedId}`}
        className={cn({ [classes.mapError]: !isValid })}
      >
        <Map
          baseComponentId={baseComponentId}
          readOnly={readOnly ?? false}
        />
      </div>
      {dataModelBindings?.simpleBinding && <MarkerLocationText baseComponentId={baseComponentId} />}
    </ComponentStructureWrapper>
  );
}
