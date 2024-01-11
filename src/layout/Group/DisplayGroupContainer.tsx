import React from 'react';

import { Heading } from '@digdir/design-system-react';
import cn from 'classnames';

import { Fieldset } from 'src/components/form/Fieldset';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/Group/DisplayGroupContainer.module.css';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import type { HeadingLevel } from 'src/layout/common.generated';
import type {
  CompGroupNonRepeatingInternal,
  CompGroupNonRepeatingPanelInternal,
} from 'src/layout/Group/config.generated';
import type { LayoutNodeForGroup } from 'src/layout/Group/LayoutNodeForGroup';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface IDisplayGroupContainer {
  ref?: React.Ref<HTMLDivElement>;
  groupNode: LayoutNodeForGroup<CompGroupNonRepeatingInternal | CompGroupNonRepeatingPanelInternal>;
  id?: string;
  onlyRowIndex?: number | undefined;
  isSummary?: boolean;
  renderLayoutNode: (node: LayoutNode) => JSX.Element | null;
}

const headingSizes: { [k in HeadingLevel]: Parameters<typeof Heading>[0]['size'] } = {
  [2]: 'medium',
  [3]: 'small',
  [4]: 'xsmall',
  [5]: 'xsmall',
  [6]: 'xsmall',
};

export function DisplayGroupContainer({
  ref,
  groupNode,
  id,
  onlyRowIndex,
  isSummary,
  renderLayoutNode,
}: IDisplayGroupContainer) {
  const container = groupNode.item;
  const { title, summaryTitle, description } = container.textResourceBindings ?? {};

  if (groupNode.isHidden()) {
    return null;
  }

  const isNested = groupNode.parent instanceof BaseLayoutNode;
  const headingLevel = Math.min(Math.max(groupNode.parents().length + 1, 2), 6) as HeadingLevel;
  const headingSize = headingSizes[headingLevel];
  const legend = isSummary ? summaryTitle : title;

  return (
    <Fieldset
      legend={
        legend && (
          <Heading
            level={headingLevel}
            size={headingSize}
          >
            <Lang id={legend} />
          </Heading>
        )
      }
      className={isSummary ? classes.summary : classes.group}
      description={description && !isSummary && <Lang id={description} />}
    >
      <div
        ref={ref}
        id={id || container.id}
        data-componentid={container.id}
        data-testid='display-group-container'
        className={cn(
          { [classes.groupingIndicator]: !!container.showGroupingIndicator && !isNested },
          classes.groupContainer,
        )}
      >
        {groupNode.children(undefined, onlyRowIndex).map((n) => renderLayoutNode(n))}
      </div>
    </Fieldset>
  );
}
