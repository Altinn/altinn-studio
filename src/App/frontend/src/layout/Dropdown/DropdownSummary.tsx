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
import { useEvalExpression, useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export const DropdownSummary = ({ targetBaseComponentId }: Summary2Props) => {
  const emptyFieldText = useSummaryOverrides(targetBaseComponentId)?.emptyFieldText;
  const isCompact = useSummaryProp('isCompact');
  const displayData = useDisplayData(targetBaseComponentId);
  const validations = useUnifiedValidationsForNode(targetBaseComponentId);
  const errors = validationsOfSeverity(validations, 'error');
  const config = useComponentConfig(targetBaseComponentId, 'Dropdown');
  const summaryTitle = useEvalOptionalText(
    config.textResourceBindings?.summaryTitle,
    Expressions.Dropdown.textResourceBindings.summaryTitle,
  );
  const resolvedTitle = useEvalOptionalText(
    config.textResourceBindings?.title,
    Expressions.Dropdown.textResourceBindings.title,
  );
  const required = useEvalExpression(config.required, Expressions.Dropdown.required);

  const title = summaryTitle || resolvedTitle;
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
