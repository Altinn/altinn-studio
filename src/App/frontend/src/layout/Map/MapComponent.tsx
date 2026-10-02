import React from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import cn from 'classnames';

import { useIsValid } from 'src/features/validation/selectors/isValid';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { MapAttribution } from 'src/layout/Map/features/attribution/MapAttribution';
import { MarkerLocationText } from 'src/layout/Map/features/singleMarker/MarkerLocationText';
import { Map } from 'src/layout/Map/Map';
import classes from 'src/layout/Map/MapComponent.module.css';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export function MapComponent({ baseComponentId }: PropsFromGenericComponent<'Map'>) {
  const isValid = useIsValid(baseComponentId);
  const config = useComponentConfig(baseComponentId, 'Map');
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'Map');
  const readOnly = useEvalExpression(config.readOnly, Expressions.Map.readOnly);

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
      <MapAttribution baseComponentId={baseComponentId} />
      {dataModelBindings?.simpleBinding && <MarkerLocationText baseComponentId={baseComponentId} />}
    </ComponentStructureWrapper>
  );
}
