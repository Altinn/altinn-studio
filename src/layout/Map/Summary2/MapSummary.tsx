import React from 'react';

import { ErrorMessage } from '@digdir/designsystemet-react';
import { Typography } from '@material-ui/core';
import cn from 'classnames';

import { Label } from 'src/components/label/Label';
import { Lang } from 'src/features/language/Lang';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { Map } from 'src/layout/Map/Map';
import classes from 'src/layout/Map/Summary2/MapSummary.module.css';
import { isLocationValid, parseLocation } from 'src/layout/Map/utils';
import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { useNodeFormData, useNodeItem } from 'src/utils/layout/useNodeItem';
import type { RawGeometry } from 'src/layout/Map/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export type MapSummaryProps = {
  componentNode: LayoutNode<'Map'>;
  isCompact?: boolean;
  emptyFieldText?: string;
};

export function MapSummary({ componentNode, emptyFieldText, isCompact }: MapSummaryProps) {
  const markerBinding = useNodeItem(componentNode, (item) => item.dataModelBindings.simpleBinding);
  const readOnly = useNodeItem(componentNode, (item) => item.readOnly);
  const formData = useNodeFormData(componentNode);
  const markerLocation = parseLocation(formData.simpleBinding);
  const markerLocationIsValid = isLocationValid(markerLocation);
  const geometries = formData.geometries as RawGeometry[] | undefined;
  const validations = useUnifiedValidationsForNode(componentNode);
  const errors = validationsOfSeverity(validations, 'error');
  const title = useNodeItem(componentNode, (i) => i.textResourceBindings?.title);

  if (markerBinding && !markerLocationIsValid) {
    return (
      <SingleValueSummary
        title={title}
        componentNode={componentNode}
        errors={errors}
        hideEditButton={readOnly}
        isCompact={isCompact}
        emptyFieldText={emptyFieldText}
      />
    );
  }

  return (
    <div className={classes.summaryItemWrapper}>
      <div className={classes.summaryItem}>
        <Label
          node={componentNode}
          renderLabelAs='span'
          textResourceBindings={{ title }}
        />
        {!readOnly && (
          <EditButton
            className={classes.editButton}
            componentNode={componentNode}
            summaryComponentId={componentNode.id}
          />
        )}
      </div>
      <Map
        mapNode={componentNode}
        markerLocation={markerLocation}
        geometries={geometries}
        isSummary={true}
      />
      {markerLocation && (
        <Typography className={cn(classes.footer, classes.summaryValue, { [classes.error]: errors.length > 0 })}>
          <Lang
            id={'map_component.selectedLocation'}
            params={[markerLocation.latitude, markerLocation.longitude]}
          />
        </Typography>
      )}
      {errors?.map(({ message }) => (
        <ErrorMessage key={message.key}>
          <Lang
            id={message.key}
            params={message.params}
            node={componentNode}
          ></Lang>
        </ErrorMessage>
      ))}
    </div>
  );
}
