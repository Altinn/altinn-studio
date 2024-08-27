import React from 'react';

import { Grid } from '@material-ui/core';
import cn from 'classnames';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import classes from 'src/layout/Summary2/SummaryComponent2/SummaryComponent2.module.css';
import { useTaskStore } from 'src/layout/Summary2/taskIdStore';
import { gridBreakpoints, pageBreakStyles } from 'src/utils/formComponentUtils';
import { useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { CompExternal, CompInternal, CompTypes } from 'src/layout/layout';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface ComponentSummaryProps<T extends CompTypes> {
  componentNode: LayoutNode<T>;
  summaryOverrides?: CompInternal<'Summary2'>['overrides'];
  isCompact?: boolean;
}

export function ComponentSummary<T extends CompTypes>({
  componentNode,
  summaryOverrides,
  isCompact,
}: ComponentSummaryProps<T>) {
  const { pageBreak, grid, required, dataModelBindings, forceShowInSummary } = useNodeItem(componentNode, (i) => ({
    pageBreak: i.pageBreak,
    grid: i.grid,
    required: 'required' in i ? i.required : false,
    dataModelBindings: i.dataModelBindings,
    forceShowInSummary: 'forceShowInSummary' in i ? i.forceShowInSummary : undefined,
  }));
  const overrides = summaryOverrides?.find((override) => override.componentId === componentNode.baseId);
  const props: Summary2Props<T> = {
    target: componentNode,
    overrides: summaryOverrides,
    isCompact,
  };

  const summaryNode = useTaskStore((state) => state.summaryNode);
  const hideEmptyFields = useNodeItem(summaryNode, (i) => i.hideEmptyFields);

  const { formData } = useDataModelBindings(dataModelBindings);

  const noUserInput = Object.values(formData).every((value) => value?.length < 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderedComponent = componentNode.def.renderSummary2 ? componentNode.def.renderSummary2(props as any) : null;
  if (!renderedComponent) {
    return null;
  }

  if (overrides?.hidden) {
    return null;
  }

  if (noUserInput && hideEmptyFields && !required && !forceShowInSummary) {
    return null;
  }

  return (
    <Grid
      item={true}
      className={cn(pageBreakStyles(pageBreak), classes.summaryItem)}
      {...gridBreakpoints(grid)}
    >
      {renderedComponent}
    </Grid>
  );
}

interface ResolveComponentProps {
  summaryTarget: CompExternal<'Summary2'>['target'];
  summaryOverrides?: CompInternal<'Summary2'>['overrides'];
}

export function ResolveComponent({ summaryTarget, summaryOverrides }: ResolveComponentProps) {
  if (!summaryTarget?.id) {
    window.logError('Tried to render component without component ID, please add id property to target.');
    throw new Error();
  }

  const resolvedComponent = useNode(summaryTarget.id);
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
