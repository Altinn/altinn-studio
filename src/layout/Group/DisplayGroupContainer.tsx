import React from 'react';

import { Heading } from '@digdir/design-system-react';
import { Grid } from '@material-ui/core';
import cn from 'classnames';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/Group/DisplayGroupContainer.module.css';
import { pageBreakStyles } from 'src/utils/formComponentUtils';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import type { HeadingLevel } from 'src/layout/common.generated';
import type {
  CompGroupNonRepeatingInternal,
  CompGroupNonRepeatingPanelInternal,
} from 'src/layout/Group/config.generated';
import type { LayoutNodeForGroup } from 'src/layout/Group/LayoutNodeForGroup';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface IDisplayGroupContainer {
  groupNode: LayoutNodeForGroup<CompGroupNonRepeatingInternal | CompGroupNonRepeatingPanelInternal>;
  id?: string;
  onlyRowIndex?: number | undefined;
  renderLayoutNode: (node: LayoutNode) => JSX.Element | null;
}

const headingSizes: { [k in HeadingLevel]: Parameters<typeof Heading>[0]['size'] } = {
  [2]: 'medium',
  [3]: 'small',
  [4]: 'xsmall',
  [5]: 'xsmall',
  [6]: 'xsmall',
};

export function DisplayGroupContainer({ groupNode, id, onlyRowIndex, renderLayoutNode }: IDisplayGroupContainer) {
  const container = groupNode.item;
  if (groupNode.isHidden()) {
    return null;
  }

  const isNested = groupNode.parent instanceof BaseLayoutNode;
  const headingLevel = Math.min(Math.max(groupNode.parents().length + 1, 2), 6) as HeadingLevel;
  const headingSize = headingSizes[headingLevel];

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
      {(container.textResourceBindings?.title || container.textResourceBindings?.body) && (
        <Grid
          item={true}
          xs={12}
        >
          {container.textResourceBindings?.title && (
            <Heading
              level={headingLevel}
              size={headingSize}
            >
              <Lang id={container.textResourceBindings?.title} />
            </Heading>
          )}
          {container.textResourceBindings?.body && (
            <p className={classes.groupBody}>
              <Lang id={container.textResourceBindings?.body} />
            </p>
          )}
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
