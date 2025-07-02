import React from 'react';
import type { JSX } from 'react';

import { Heading } from '@digdir/designsystemet-react';

import { Fieldset } from 'src/app-components/Label/Fieldset';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/Likert/Summary/LikertSummaryComponent.module.css';
import { Hidden, NodesInternal } from 'src/utils/layout/NodesContext';
import { useItemWhenType, useNodeDirectChildren } from 'src/utils/layout/useNodeItem';
import type { HeadingLevel } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface IDisplayLikertContainer {
  likertNode: LayoutNode<'Likert'>;
  divRef?: React.Ref<HTMLDivElement>;
  id?: string;
  restriction?: number | undefined;
  renderLayoutNode: (node: LayoutNode) => JSX.Element | null;
}

const headingSizes: { [k in HeadingLevel]: Parameters<typeof Heading>[0]['data-size'] } = {
  [2]: 'md',
  [3]: 'sm',
  [4]: 'xs',
  [5]: 'xs',
  [6]: 'xs',
};

export function LargeLikertSummaryContainer({
  divRef,
  likertNode,
  id,
  restriction,
  renderLayoutNode,
}: IDisplayLikertContainer) {
  const container = useItemWhenType(likertNode.baseId, 'Likert');
  const { title, summaryTitle } = container.textResourceBindings ?? {};
  const isHidden = Hidden.useIsHidden(likertNode);
  const depth = NodesInternal.useSelector((state) => state.nodeData?.[likertNode.id]?.depth);
  const children = useNodeDirectChildren(likertNode, restriction);

  if (isHidden) {
    return null;
  }

  const headingLevel = Math.min(Math.max(depth + 1, 2), 6) as HeadingLevel;
  const headingSize = headingSizes[headingLevel];
  const legend = summaryTitle ?? title;

  return (
    <Fieldset
      legend={
        legend && (
          <Heading
            level={headingLevel}
            data-size={headingSize}
          >
            <Lang id={legend} />
          </Heading>
        )
      }
      className={classes.summary}
      data-componentid={likertNode.id}
      data-componentbaseid={likertNode.baseId}
    >
      <div
        ref={divRef}
        id={id || container.id}
        data-testid='display-group-container'
      >
        {children.map((n) => renderLayoutNode(n))}
      </div>
    </Fieldset>
  );
}
