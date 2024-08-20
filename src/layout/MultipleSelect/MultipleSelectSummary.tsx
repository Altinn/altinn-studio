import React from 'react';

import { Lang } from 'src/features/language/Lang';
import { MultipleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/MultipleValueSummary';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { CompInternal } from 'src/layout/layout';
import type { MultipleSelectSummaryOverrideProps } from 'src/layout/Summary2/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function MultipleSelectSummary({
  componentNode,
  summaryOverrides,
  displayData,
}: {
  componentNode: LayoutNode<'MultipleSelect'>;
  summaryOverrides?: CompInternal<'Summary2'>['overrides'];
  displayData: string;
}) {
  const maxStringLength = 75;
  const overrides = summaryOverrides?.find((override) => override.componentId === componentNode.baseId) as
    | MultipleSelectSummaryOverrideProps
    | undefined;
  const showAsList =
    overrides?.displayType === 'list' || (!overrides?.displayType && displayData?.length >= maxStringLength);
  const title = useNodeItem(componentNode, (i) => i.textResourceBindings?.title);

  return (
    <MultipleValueSummary
      title={<Lang id={title} />}
      componentNode={componentNode}
      showAsList={showAsList}
    />
  );
}
