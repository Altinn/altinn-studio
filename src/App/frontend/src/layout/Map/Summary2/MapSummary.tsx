import React from 'react';

import { Paragraph, ValidationMessage } from '@digdir/designsystemet-react';
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
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useFormDataFor, useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export function MapSummary({ targetBaseComponentId }: Summary2Props) {
  const emptyFieldText = useSummaryOverrides(targetBaseComponentId)?.emptyFieldText;
  const isCompact = useSummaryProp('isCompact');
  const { dataModelBindings, readOnly, textResourceBindings, required } = useItemWhenType(targetBaseComponentId, 'Map');
  const markerBinding = dataModelBindings.simpleBinding;
  const formData = useFormDataFor<'Map'>(targetBaseComponentId);
  const markerLocation = parseLocation(formData.simpleBinding);
  const markerLocationIsValid = isLocationValid(markerLocation);
  const validations = useUnifiedValidationsForNode(targetBaseComponentId);
  const errors = validationsOfSeverity(validations, 'error');
  const title = textResourceBindings?.title;

  if (markerBinding && !markerLocationIsValid) {
    return (
      <SummaryFlex
        targetBaseId={targetBaseComponentId}
        content={required ? SummaryContains.EmptyValueRequired : SummaryContains.EmptyValueNotRequired}
      >
        <SingleValueSummary
          title={<Lang id={title} />}
          targetBaseComponentId={targetBaseComponentId}
          errors={errors}
          hideEditButton={readOnly}
          isCompact={isCompact}
          emptyFieldText={emptyFieldText}
        />
      </SummaryFlex>
    );
  }

  return (
    <SummaryFlex
      targetBaseId={targetBaseComponentId}
      content={
        markerLocation
          ? SummaryContains.SomeUserContent
          : required
            ? SummaryContains.EmptyValueRequired
            : SummaryContains.EmptyValueNotRequired
      }
    >
      <div className={classes.summaryItemWrapper}>
        <div className={classes.summaryItem}>
          <Label
            baseComponentId={targetBaseComponentId}
            renderLabelAs='span'
            textResourceBindings={{ title }}
          />
          {!readOnly && (
            <EditButton
              className={classes.editButton}
              targetBaseComponentId={targetBaseComponentId}
            />
          )}
        </div>
        <Map
          baseComponentId={targetBaseComponentId}
          readOnly={true}
          animate={false}
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
          <ValidationMessage key={message.key}>
            <Lang
              id={message.key}
              params={message.params}
            />
          </ValidationMessage>
        ))}
      </div>
    </SummaryFlex>
  );
}
