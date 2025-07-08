import React from 'react';
import type { JSX } from 'react';

import { Fieldset, Heading } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/RepeatingGroup/Summary/LargeGroupSummaryContainer.module.css';
import { pageBreakStyles } from 'src/utils/formComponentUtils';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { Hidden, NodesInternal, useNode } from 'src/utils/layout/NodesContext';
import { useItemWhenType, useNodeDirectChildren } from 'src/utils/layout/useNodeItem';
import type { HeadingLevel } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface IDisplayRepAsLargeGroup {
  baseComponentId: string;
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

export function LargeGroupSummaryContainer({
  baseComponentId,
  id,
  restriction,
  renderLayoutNode,
}: IDisplayRepAsLargeGroup) {
  const item = useItemWhenType(baseComponentId, 'RepeatingGroup');
  const indexedId = useIndexedId(baseComponentId, true);
  const isHidden = Hidden.useIsHidden(indexedId);
  const depth = NodesInternal.useSelector((state) => state.nodeData?.[indexedId]?.depth);
  const node = useNode(indexedId);
  const children = useNodeDirectChildren(node, restriction);
  const layoutLookups = useLayoutLookups();
  if (isHidden || typeof depth !== 'number') {
    return null;
  }
  const { title, summaryTitle } = item.textResourceBindings || {};

  const parent = layoutLookups.componentToParent[baseComponentId];
  const isNested = parent?.type === 'node';
  const headingLevel = Math.min(Math.max(depth + 1, 2), 6) as HeadingLevel;
  const headingSize = headingSizes[headingLevel];
  const legend = summaryTitle ?? title;

  return (
    <Fieldset
      className={cn(pageBreakStyles(item.pageBreak), classes.summary, {
        [classes.largeGroupContainer]: !isNested,
      })}
    >
      <Fieldset.Legend>
        <Heading
          level={headingLevel}
          data-size={headingSize}
        >
          <Lang id={legend} />
        </Heading>
      </Fieldset.Legend>
      <div
        id={id || item.id}
        className={classes.largeGroupContainer}
      >
        {children.map((n) => renderLayoutNode(n))}
      </div>
    </Fieldset>
  );
}
