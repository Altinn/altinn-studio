import React from 'react';

import { Grid } from '@material-ui/core';
import cn from 'classnames';

import classes from 'src/layout/Summary2/SummaryComponent2/SummaryComponent2.module.css';
import { gridBreakpoints, pageBreakStyles } from 'src/utils/formComponentUtils';
import { useNode } from 'src/utils/layout/NodesContext';
import type { CompSummary2External, CompSummary2Internal } from 'src/layout/Summary2/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface ComponentSummaryProps {
  componentNode: LayoutNode;
  summaryOverrides?: CompSummary2Internal['overrides'];
}

interface ResolveComponentProps {
  summaryProps: CompSummary2External;
  summaryOverrides?: CompSummary2Internal['overrides'];
}
export function ComponentSummary({ componentNode, summaryOverrides }: ComponentSummaryProps) {
  const override = summaryOverrides?.find((override) => override.componentId === componentNode.item.id);

  const renderedComponent = componentNode.def.renderSummary2
    ? componentNode.def.renderSummary2(componentNode as LayoutNode<any>, override)
    : null;

  if (!renderedComponent) {
    return null;
  }

  if (override?.hidden) {
    return null;
  }

  return (
    <Grid
      item={true}
      className={cn(pageBreakStyles(componentNode.item?.pageBreak), classes.summaryItem)}
      {...gridBreakpoints(componentNode.item.grid)}
    >
      {renderedComponent}
    </Grid>
  );
}

export function ResolveComponent({ summaryProps, summaryOverrides }: ResolveComponentProps) {
  if (!summaryProps.target?.id) {
    window.logError('Tried to render component without component ID, please add id property to target.');
    throw new Error();
  }

  const resolvedComponent = useNode(summaryProps.target.id);
  if (!resolvedComponent) {
    return null;
  }

  return (
    <ComponentSummary
      componentNode={resolvedComponent}
      summaryOverrides={summaryOverrides}
    />
  );
}
