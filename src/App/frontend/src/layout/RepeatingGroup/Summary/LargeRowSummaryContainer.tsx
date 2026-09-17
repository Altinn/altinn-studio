import React from 'react';
import type { JSX } from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Fieldset, Heading } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { HeadingLevel } from '@app/layout-contract/generated/common.generated';

import { FormStore } from 'src/features/form/FormContext';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/RepeatingGroup/Summary/LargeGroupSummaryContainer.module.css';
import { useHiddenColumns } from 'src/layout/RepeatingGroup/useHiddenColumns';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { pageBreakStyles } from 'src/utils/formComponentUtils';
import { useComponentIdMutator, useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useIsHiddenMulti } from 'src/utils/layout/hidden';
import { getLayoutDepth } from 'src/utils/layout/hierarchy';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import { useResolvedPageBreak } from 'src/utils/layout/useResolvedPageBreak';

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
  const config = useComponentConfig(baseComponentId, 'RepeatingGroup');
  const componentId = useIndexedId(baseComponentId);
  const resolvedTitle = useEvalExpression(
    config.textResourceBindings?.title,
    Expressions.RepeatingGroup.textResourceBindings.title,
  );
  const resolvedSummaryTitle = useEvalExpression(
    config.textResourceBindings?.summaryTitle,
    Expressions.RepeatingGroup.textResourceBindings.summaryTitle,
  );

  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
  const depth = getLayoutDepth(baseComponentId, layoutLookups);
  const children = RepGroupHooks.useChildIds(baseComponentId);
  const isHidden = useIsHiddenMulti(children);
  const idMutator = useComponentIdMutator();

  const hiddenColumns = useHiddenColumns(config.tableColumns);

  const title = config.textResourceBindings?.title === undefined ? undefined : resolvedTitle;
  const summaryTitle = config.textResourceBindings?.summaryTitle === undefined ? undefined : resolvedSummaryTitle;

  const parent = layoutLookups.componentToParent[baseComponentId];
  const isNested = parent?.type === 'node';
  const headingLevel = Math.min(Math.max(depth + 1, 2), 6) as HeadingLevel;
  const headingSize = headingSizes[headingLevel];
  const legend = summaryTitle ?? title;

  const resolvedPageBreak = useResolvedPageBreak(config.pageBreak);
  return (
    <Fieldset
      className={cn(pageBreakStyles(resolvedPageBreak), classes.summary, {
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
        id={id || componentId}
        className={classes.largeGroupContainer}
      >
        {children.map((baseId) => {
          if (inExcludedChildren(idMutator(baseId), baseId) || isHidden[baseId] || hiddenColumns.includes(baseId)) {
            return null;
          }

          return renderLayoutComponent(baseId);
        })}
      </div>
    </Fieldset>
  );
}
