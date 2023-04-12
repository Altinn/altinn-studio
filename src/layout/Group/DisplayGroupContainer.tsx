import React from 'react';

import { Grid, makeStyles, Typography } from '@material-ui/core';
import cn from 'classnames';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { pageBreakStyles } from 'src/utils/formComponentUtils';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface IDisplayGroupContainer {
  groupNode: LayoutNode;
  id?: string;
  onlyRowIndex?: number | undefined;
  renderLayoutNode: (node: LayoutNode) => JSX.Element | null;
}

const useStyles = makeStyles({
  groupTitle: {
    fontWeight: 700,
    fontSize: '1.5rem',
    paddingBottom: 12,
  },
  groupContainer: {
    paddingBottom: 38,
  },
});

export function DisplayGroupContainer({ groupNode, id, onlyRowIndex, renderLayoutNode }: IDisplayGroupContainer) {
  const container = groupNode.item;
  const classes = useStyles();
  const title = useAppSelector((state) => {
    const titleKey = container.textResourceBindings?.title;
    if (titleKey && state.language.language) {
      return getTextFromAppOrDefault(titleKey, state.textResources.resources, state.language.language, [], true);
    }
    return undefined;
  });

  if (groupNode.isHidden()) {
    return null;
  }

  return (
    <Grid
      container={true}
      item={true}
      id={id || container.id}
      className={cn(classes.groupContainer, pageBreakStyles(container.pageBreak))}
      spacing={3}
      alignItems='flex-start'
      data-testid='display-group-container'
      data-componentid={container.baseComponentId ?? container.id}
    >
      {title && (
        <Grid
          item={true}
          xs={12}
        >
          <Typography
            className={classes.groupTitle}
            variant='h2'
          >
            {title}
          </Typography>
        </Grid>
      )}
      {groupNode.children(undefined, onlyRowIndex).map((n) => renderLayoutNode(n))}
    </Grid>
  );
}
