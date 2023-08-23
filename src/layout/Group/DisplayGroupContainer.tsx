import React from 'react';

import { Heading } from '@digdir/design-system-react';
import { Grid } from '@material-ui/core';
import cn from 'classnames';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { useLanguage } from 'src/hooks/useLanguage';
import classes from 'src/layout/Group/DisplayGroupContainer.module.css';
import { pageBreakStyles } from 'src/utils/formComponentUtils';
import { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { HeadingLevel } from 'src/types/shared';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

export interface IDisplayGroupContainer {
  groupNode: LayoutNodeFromType<'Group'>;
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
  const { lang, langAsString } = useLanguage();
  const container = groupNode.item;
  const title = langAsString(container.textResourceBindings?.title);
  const body = lang(container.textResourceBindings?.body);

  if (groupNode.isHidden()) {
    return null;
  }

  const isNested = groupNode.parent instanceof LayoutNode;
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
      {(title || body) && (
        <Grid
          item={true}
          xs={12}
        >
          {title && (
            <Heading
              level={headingLevel}
              size={headingSize}
            >
              {title}
            </Heading>
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
