import React from 'react';
import type { JSX } from 'react';

import { Fieldset, Heading } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/RepeatingGroup/Summary/LargeGroupSummaryContainer.module.css';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { pageBreakStyles } from 'src/utils/formComponentUtils';
import { useComponentIdMutator, useIndexedId } from 'src/utils/layout/DataModelLocation';
import { Hidden, NodesInternal } from 'src/utils/layout/NodesContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { HeadingLevel } from 'src/layout/common.generated';

export interface IDisplayRepAsLargeGroup {
  baseComponentId: string;
  id?: string;
  renderLayoutComponent: (baseId: string) => JSX.Element | null;
  inExcludedChildren: (indexedId: string, baseId: string) => boolean;
}

const headingSizes: { [k in HeadingLevel]: Parameters<typeof Heading>[0]['data-size'] } = {
  [2]: 'md',
  [3]: 'sm',
  [4]: 'xs',
  [5]: 'xs',
  [6]: 'xs',
};

export function LargeRowSummaryContainer({
  baseComponentId,
  id,
  renderLayoutComponent,
  inExcludedChildren,
}: IDisplayRepAsLargeGroup) {
  const item = useItemWhenType(baseComponentId, 'RepeatingGroup');
  const isHidden = Hidden.useIsHiddenSelector();
  const indexedId = useIndexedId(baseComponentId, true);
  const depth = NodesInternal.useSelector((state) => state.nodeData?.[indexedId]?.depth);
  const layoutLookups = useLayoutLookups();
  const children = RepGroupHooks.useChildIds(baseComponentId);
  const idMutator = useComponentIdMutator();

  if (typeof depth !== 'number') {
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
        {children.map((id) => {
          if (inExcludedChildren(idMutator(id), id) || isHidden(idMutator(id), 'node')) {
            return null;
          }

          return renderLayoutComponent(id);
        })}
      </div>
    </Fieldset>
  );
}
