import React from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { Lang } from 'src/features/language/Lang';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export const DateSummary = ({ targetBaseComponentId }: Summary2Props) => {
  const emptyFieldText = useSummaryOverrides<'Date'>(targetBaseComponentId)?.emptyFieldText;
  const isCompact = useSummaryProp('isCompact');
  const displayData = useDisplayData(targetBaseComponentId);
  const validations = useUnifiedValidationsForNode(targetBaseComponentId);
  const errors = validationsOfSeverity(validations, 'error');
  const config = useComponentConfig(targetBaseComponentId, 'Date');
  const summaryTitle = useEvalExpression(
    config.textResourceBindings?.summaryTitle,
    Expressions.Date.textResourceBindings.summaryTitle,
  );
  const resolvedTitle = useEvalExpression(
    config.textResourceBindings?.title,
    Expressions.Date.textResourceBindings.title,
  );

  const title =
    (config.textResourceBindings?.summaryTitle === undefined ? undefined : summaryTitle) ||
    (config.textResourceBindings?.title === undefined ? undefined : resolvedTitle);
  const compact = (config.direction === 'horizontal' && isCompact == undefined) || isCompact;
  return (
    <SummaryFlex
      targetBaseId={targetBaseComponentId}
      content={displayData ? SummaryContains.SomeUserContent : SummaryContains.EmptyValueNotRequired}
    >
      <SingleValueSummary
        title={title && <Lang id={title} />}
        displayData={displayData}
        errors={errors}
        targetBaseComponentId={targetBaseComponentId}
        hideEditButton
        isCompact={compact}
        emptyFieldText={emptyFieldText}
      />
    </SummaryFlex>
  );
};
