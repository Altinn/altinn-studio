import React from 'react';
import type { JSX } from 'react';

import { Heading } from '@digdir/designsystemet-react';

import { Fieldset } from 'src/app-components/Label/Fieldset';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/Likert/Summary/LikertSummaryComponent.module.css';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { Hidden, NodesInternal, useNode } from 'src/utils/layout/NodesContext';
import { useItemWhenType, useNodeDirectChildren } from 'src/utils/layout/useNodeItem';
import type { HeadingLevel } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface IDisplayLikertContainer {
  likertBaseId: string;
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
  likertBaseId,
  id,
  restriction,
  renderLayoutNode,
}: IDisplayLikertContainer) {
  const container = useItemWhenType(likertBaseId, 'Likert');
  const { title, summaryTitle } = container.textResourceBindings ?? {};
  const indexedId = useIndexedId(likertBaseId, true);
  const isHidden = Hidden.useIsHidden(indexedId);
  const depth = NodesInternal.useSelector((state) => state.nodeData?.[indexedId]?.depth);
  const likertNode = useNode(indexedId);
  const children = useNodeDirectChildren(likertNode, restriction);

  if (isHidden || typeof depth !== 'number') {
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
