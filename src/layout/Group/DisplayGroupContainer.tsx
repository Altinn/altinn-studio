import React from 'react';

import { Grid } from '@material-ui/core';
import cn from 'classnames';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { useLanguage } from 'src/hooks/useLanguage';
import classes from 'src/layout/Group/DisplayGroupContainer.module.css';
import { pageBreakStyles } from 'src/utils/formComponentUtils';
import { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { HGroups } from 'src/layout/Group/types';

const H = ({ level, children, ...props }) => {
  switch (level) {
    case 1:
      return <h1 {...props}>{children}</h1>;
    case 2:
      return <h2 {...props}>{children}</h2>;
    case 3:
      return <h3 {...props}>{children}</h3>;
    case 4:
      return <h4 {...props}>{children}</h4>;
    case 5:
      return <h5 {...props}>{children}</h5>;
    case 6:
      return <h6 {...props}>{children}</h6>;
    default:
      console.warn(`Heading level ${level} is not supported`);
      return <h2 {...props}>{children}</h2>;
  }
};

export interface IDisplayGroupContainer {
  groupNode: LayoutNode<HGroups, 'Group'>;
  id?: string;
  onlyRowIndex?: number | undefined;
  renderLayoutNode: (node: LayoutNode) => JSX.Element | null;
}

export function DisplayGroupContainer({ groupNode, id, onlyRowIndex, renderLayoutNode }: IDisplayGroupContainer) {
  const { lang, langAsString } = useLanguage();
  const container = groupNode.item;
  const title = langAsString(container.textResourceBindings?.title);
  const body = lang(container.textResourceBindings?.body);

  if (groupNode.isHidden()) {
    return null;
  }

  const isNested = groupNode.parent instanceof LayoutNode;
  const headingLevel = Math.min(Math.max(groupNode.parents().length + 1, 2), 6);

  return (
    <Grid
      container={true}
      item={true}
      id={id || container.id}
      className={cn(pageBreakStyles(container.pageBreak), {
        [classes.groupContainer]: !isNested,
        [classes.groupingIndicator]: !!container.showGroupingIndicator && isNested,
      })}
      spacing={3}
      alignItems='flex-start'
      data-testid='display-group-container'
      data-componentid={container.id}
    >
      {(title || body) && (
        <Grid
          item={true}
          xs={12}
        >
          {title && (
            <H
              level={headingLevel}
              className={classes.groupTitle}
            >
              {title}
            </H>
          )}
          {body && <p className={classes.groupBody}>{body}</p>}
        </Grid>
      )}
      <ConditionalWrapper
        condition={!!container.showGroupingIndicator && !isNested}
        wrapper={(children) => (
          <Grid
            item={true}
            container={true}
            spacing={3}
            alignItems='flex-start'
            className={classes.groupingIndicator}
          >
            {children}
          </Grid>
        )}
      >
        <>{groupNode.children(undefined, onlyRowIndex).map((n) => renderLayoutNode(n))}</>
      </ConditionalWrapper>
    </Grid>
  );
}
