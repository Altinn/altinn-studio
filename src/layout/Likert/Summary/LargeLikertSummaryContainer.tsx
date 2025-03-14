import React from 'react';
import type { JSX } from 'react';

import { Heading } from '@digdir/designsystemet-react';

import { Fieldset } from 'src/app-components/Label/Fieldset';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/Likert/Summary/LikertSummaryComponent.module.css';
import { Hidden, NodesInternal } from 'src/utils/layout/NodesContext';
import { useNodeDirectChildren, useNodeItem } from 'src/utils/layout/useNodeItem';
import type { HeadingLevel } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface IDisplayLikertContainer {
  groupNode: LayoutNode<'Likert'>;
  divRef?: React.Ref<HTMLDivElement>;
  id?: string;
  restriction?: number | undefined;
  renderLayoutNode: (node: LayoutNode) => JSX.Element | null;
}

const headingSizes: { [k in HeadingLevel]: Parameters<typeof Heading>[0]['size'] } = {
  [2]: 'medium',
  [3]: 'small',
  [4]: 'xsmall',
  [5]: 'xsmall',
  [6]: 'xsmall',
};

export function LargeLikertSummaryContainer({
  divRef,
  groupNode,
  id,
  restriction,
  renderLayoutNode,
}: IDisplayLikertContainer) {
  const container = useNodeItem(groupNode);
  const { title, summaryTitle } = container.textResourceBindings ?? {};
  const isHidden = Hidden.useIsHidden(groupNode);
  const depth = NodesInternal.useSelector((state) => state.nodeData?.[groupNode.id]?.depth);
  const children = useNodeDirectChildren(groupNode, restriction);

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
            size={headingSize}
          >
            <Lang id={legend} />
          </Heading>
        )
      }
      className={classes.summary}
      data-componentid={groupNode.id}
      data-componentbaseid={groupNode.baseId}
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
