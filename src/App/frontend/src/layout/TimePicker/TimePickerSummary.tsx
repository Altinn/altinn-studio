import React from 'react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { Lang } from 'src/features/language/Lang';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export const TimePickerSummary = ({ targetBaseComponentId }: Summary2Props) => {
  const emptyFieldText = useSummaryOverrides<'TimePicker'>(targetBaseComponentId)?.emptyFieldText;
  const isCompact = useSummaryProp('isCompact');
  const displayData = useDisplayData(targetBaseComponentId);
  const validations = useUnifiedValidationsForNode(targetBaseComponentId);
  const errors = validationsOfSeverity(validations, 'error');
  const item = useItemWhenType(targetBaseComponentId, 'TimePicker');
  const title = item.textResourceBindings?.title;

  return (
    <SummaryFlex
      targetBaseId={targetBaseComponentId}
      content={
        displayData
          ? SummaryContains.SomeUserContent
          : item.required
            ? SummaryContains.EmptyValueRequired
            : SummaryContains.EmptyValueNotRequired
      }
    >
      <SingleValueSummary
        title={title && <Lang id={title} />}
        displayData={displayData}
        errors={errors}
        targetBaseComponentId={targetBaseComponentId}
        isCompact={isCompact}
        emptyFieldText={emptyFieldText}
      />
    </SummaryFlex>
  );
};
