import React from 'react';

import { ErrorMessage, Paragraph } from '@digdir/designsystemet-react';
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
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useNodeFormData, useNodeItem } from 'src/utils/layout/useNodeItem';
import type { RawGeometry } from 'src/layout/Map/types';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export function MapSummary({ target }: Summary2Props<'Map'>) {
  const emptyFieldText = useSummaryOverrides(target)?.emptyFieldText;
  const isCompact = useSummaryProp('isCompact');
  const markerBinding = useNodeItem(target, (item) => item.dataModelBindings.simpleBinding);
  const readOnly = useNodeItem(target, (item) => item.readOnly);
  const formData = useNodeFormData(target);
  const markerLocation = parseLocation(formData.simpleBinding);
  const markerLocationIsValid = isLocationValid(markerLocation);
  const geometries = formData.geometries as RawGeometry[] | undefined;
  const validations = useUnifiedValidationsForNode(target);
  const errors = validationsOfSeverity(validations, 'error');
  const title = useNodeItem(target, (i) => i.textResourceBindings?.title);

  if (markerBinding && !markerLocationIsValid) {
    return (
      <SingleValueSummary
        title={
          <Lang
            id={title}
            node={target}
          />
        }
        componentNode={target}
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
          node={target}
          renderLabelAs='span'
          textResourceBindings={{ title }}
        />
        {!readOnly && (
          <EditButton
            className={classes.editButton}
            componentNode={target}
            summaryComponentId={target.id}
          />
        )}
      </div>
      <Map
        mapNode={target}
        markerLocation={markerLocation}
        geometries={geometries}
        isSummary={true}
      />
      {markerLocation && (
        <Paragraph className={cn(classes.footer, classes.summaryValue, { [classes.error]: errors.length > 0 })}>
          <Lang
            id='map_component.selectedLocation'
            params={[markerLocation.latitude, markerLocation.longitude]}
          />
        </Paragraph>
      )}
      {errors?.map(({ message }) => (
        <ErrorMessage key={message.key}>
          <Lang
            id={message.key}
            params={message.params}
            node={target}
          />
        </ErrorMessage>
      ))}
    </div>
  );
}
