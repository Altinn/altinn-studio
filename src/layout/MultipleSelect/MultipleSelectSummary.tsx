import React from 'react';

import { Lang } from 'src/features/language/Lang';
import { MultipleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/MultipleValueSummary';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { MultipleSelectSummaryOverrideProps } from 'src/layout/Summary2/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function MultipleSelectSummary({
  componentNode,
  summaryOverride,
  emptyFieldText,
  isCompact,
}: {
  componentNode: LayoutNode<'MultipleSelect'>;
  summaryOverride?: MultipleSelectSummaryOverrideProps;
  emptyFieldText?: string;
  isCompact?: boolean;
}) {
  const displayData = componentNode.def.useDisplayData(componentNode);

  const maxStringLength = 75;

  const showAsList =
    summaryOverride?.displayType === 'list' ||
    (!summaryOverride?.displayType && displayData?.length >= maxStringLength);
  const title = useNodeItem(componentNode, (i) => i.textResourceBindings?.title);

  return (
    <MultipleValueSummary
      title={<Lang id={title} />}
      componentNode={componentNode}
      showAsList={showAsList}
      isCompact={isCompact}
      emptyFieldText={emptyFieldText}
    />
  );
}
