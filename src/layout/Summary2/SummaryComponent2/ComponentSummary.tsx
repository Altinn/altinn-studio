import React from 'react';

import cn from 'classnames';

import { Flex } from 'src/app-components/Flex/Flex';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { getComponentDef } from 'src/layout';
import classes from 'src/layout/Summary2/SummaryComponent2/SummaryComponent2.module.css';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { pageBreakStyles } from 'src/utils/formComponentUtils';
import { Hidden, useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { CompTypes } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface ComponentSummaryProps<T extends CompTypes = CompTypes> {
  componentNode: LayoutNode<T>;
}

export function ComponentSummaryById({
  componentId,
  ...rest
}: { componentId: string } & Omit<ComponentSummaryProps, 'componentNode'>) {
  const componentNode = useNode(componentId);
  if (!componentNode) {
    return null;
  }

  return (
    <ComponentSummary
      componentNode={componentNode}
      {...rest}
    />
  );
}

export function ComponentSummary<T extends CompTypes>({ componentNode }: ComponentSummaryProps<T>) {
  const override = useSummaryOverrides(componentNode);
  const hideEmptyFields = useSummaryProp('hideEmptyFields');
  const isRequired = useNodeItem(componentNode, (i) => ('required' in i ? i.required : false));
  const dataModelBindings = useNodeItem(componentNode, (i) => i.dataModelBindings);
  const forceShowInSummary = useNodeItem(componentNode, (i) => i['forceShowInSummary']);
  const pageBreak = useNodeItem(componentNode, (i) => i.pageBreak);
  const grid = useNodeItem(componentNode, (i) => i.grid);
  const { formData } = useDataModelBindings(dataModelBindings);
  const isHidden = Hidden.useIsHidden(componentNode);
  const noUserInput = Object.values(formData).every((value) => value?.length < 1);
  const def = getComponentDef(componentNode.type);

  const hiddenByOverride = override?.hidden === true;
  const hiddenBecauseNoUserInput = noUserInput ? hideEmptyFields && !isRequired && !forceShowInSummary : false;
  if (isHidden || hiddenByOverride || hiddenBecauseNoUserInput) {
    return null;
  }

  const renderedComponent = def.renderSummary2 ? def.renderSummary2({ target: componentNode as never }) : null;
  if (!renderedComponent) {
    return null;
  }

  return (
    <Flex
      item
      className={cn(pageBreakStyles(pageBreak), classes.summaryItem)}
      size={grid}
    >
      {renderedComponent}
    </Flex>
  );
}
