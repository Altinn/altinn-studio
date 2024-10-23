import React from 'react';

import { Grid } from '@material-ui/core';
import cn from 'classnames';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import classes from 'src/layout/Summary2/SummaryComponent2/SummaryComponent2.module.css';
import { useSummary2Store } from 'src/layout/Summary2/summaryStoreContext';
import { gridBreakpoints, pageBreakStyles } from 'src/utils/formComponentUtils';
import { Hidden, useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface ComponentSummaryProps {
  componentNode: LayoutNode;
  isCompact?: boolean;
}

interface ResolveComponentProps {
  targetId: string;
}
export function ComponentSummary({ componentNode }: ComponentSummaryProps) {
  const summaryNodeItem = useSummary2Store((state) => state.summaryItem);
  const componentNodeItem = useNodeItem(componentNode);

  const override = summaryNodeItem?.overrides?.find((override) => override.componentId === componentNode.id);

  const isRequired = 'required' in componentNodeItem && componentNodeItem['required'] === true;

  const { formData } = useDataModelBindings(componentNodeItem.dataModelBindings);

  const isHidden = Hidden.useIsHidden(componentNode);

  const noUserInput = Object.values(formData).every((value) => value?.length < 1);

  const renderedComponent = componentNode.def.renderSummary2
    ? componentNode.def.renderSummary2({
        target: componentNode as LayoutNode<never>,
        override,
        isCompact: summaryNodeItem.isCompact,
      })
    : null;

  if (!renderedComponent) {
    return null;
  }

  if (isHidden) {
    return null;
  }

  if (override?.hidden) {
    return null;
  }

  if (noUserInput && summaryNodeItem?.hideEmptyFields && !isRequired && !componentNodeItem['forceShowInSummary']) {
    return null;
  }

  return (
    <Grid
      item={true}
      className={cn(pageBreakStyles(componentNodeItem?.pageBreak), classes.summaryItem)}
      {...gridBreakpoints(componentNodeItem.grid)}
    >
      {renderedComponent}
    </Grid>
  );
}

export function ResolveComponent({ targetId }: ResolveComponentProps) {
  const resolvedComponent = useNode(targetId);
  if (!resolvedComponent) {
    return null;
  }

  return <ComponentSummary componentNode={resolvedComponent} />;
}
