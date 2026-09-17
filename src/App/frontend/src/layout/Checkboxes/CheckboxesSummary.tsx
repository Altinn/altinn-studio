import React from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { Lang } from 'src/features/language/Lang';
import {
  MultipleValueSummary,
  useMultipleValuesForSummary,
} from 'src/layout/Summary2/CommonSummaryComponents/MultipleValueSummary';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export function CheckboxesSummary({ targetBaseComponentId }: Summary2Props) {
  const summaryOverride = useSummaryOverrides<'Checkboxes'>(targetBaseComponentId);
  const emptyFieldText = summaryOverride?.emptyFieldText;
  const isCompact = useSummaryProp('isCompact');
  const displayData = useDisplayData(targetBaseComponentId);
  const maxStringLength = 75;
  const showAsList =
    summaryOverride?.displayType === 'list' ||
    (!summaryOverride?.displayType && displayData?.length >= maxStringLength);
  const config = useComponentConfig(targetBaseComponentId, 'Checkboxes');
  const summaryTitle = useEvalExpression(
    config.textResourceBindings?.summaryTitle,
    Expressions.Checkboxes.textResourceBindings.summaryTitle,
  );
  const resolvedTitle = useEvalExpression(
    config.textResourceBindings?.title,
    Expressions.Checkboxes.textResourceBindings.title,
  );
  const required = useEvalExpression(config.required, Expressions.Checkboxes.required);

  const title =
    (config.textResourceBindings?.summaryTitle === undefined ? undefined : summaryTitle) ||
    (config.textResourceBindings?.title === undefined ? undefined : resolvedTitle);

  const displayValues = useMultipleValuesForSummary(targetBaseComponentId);

  return (
    <SummaryFlex
      targetBaseId={targetBaseComponentId}
      content={
        displayValues.length === 0
          ? required
            ? SummaryContains.EmptyValueRequired
            : SummaryContains.EmptyValueNotRequired
          : SummaryContains.SomeUserContent
      }
    >
      <MultipleValueSummary
        title={<Lang id={title} />}
        baseComponentId={targetBaseComponentId}
        displayValues={displayValues}
        isCompact={isCompact}
        showAsList={showAsList}
        emptyFieldText={emptyFieldText}
      />
    </SummaryFlex>
  );
}
