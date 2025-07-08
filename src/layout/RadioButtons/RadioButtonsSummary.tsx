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

export const RadioButtonsSummary = ({ targetBaseComponentId }: Summary2Props) => {
  const emptyFieldText = useSummaryOverrides<'RadioButtons'>(targetBaseComponentId)?.emptyFieldText;
  const isCompact = useSummaryProp('isCompact');
  const validations = useUnifiedValidationsForNode(targetBaseComponentId);
  const displayData = useDisplayData(targetBaseComponentId);
  const errors = validationsOfSeverity(validations, 'error');
  const { textResourceBindings, required } = useItemWhenType(targetBaseComponentId, 'RadioButtons');
  const title = textResourceBindings?.title;

  return (
    <SummaryFlex
      targetBaseId={targetBaseComponentId}
      content={
        displayData
          ? SummaryContains.SomeUserContent
          : required
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
