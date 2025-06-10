import React from 'react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { Lang } from 'src/features/language/Lang';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export const OptionSummary = ({ target }: Summary2Props<'Option'>) => {
  const emptyFieldText = useSummaryOverrides(target)?.emptyFieldText;
  const isCompact = useSummaryProp('isCompact');
  const displayData = useDisplayData(target);
  const validations = useUnifiedValidationsForNode(target);
  const errors = validationsOfSeverity(validations, 'error');
  const title = useNodeItem(target, (i) => i.textResourceBindings?.title);
  const direction = useNodeItem(target, (i) => i.direction);
  const compact = (direction === 'horizontal' && isCompact == undefined) || isCompact;

  return (
    <SummaryFlex
      target={target}
      content={displayData ? SummaryContains.SomeUserContent : SummaryContains.EmptyValueNotRequired}
    >
      <SingleValueSummary
        title={title && <Lang id={title} />}
        displayData={displayData}
        errors={errors}
        componentNode={target}
        hideEditButton
        isCompact={compact}
        emptyFieldText={emptyFieldText}
      />
    </SummaryFlex>
  );
};
