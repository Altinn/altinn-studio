import React from 'react';
import type { JSX } from 'react';

import { Heading } from '@digdir/designsystemet-react';

import { Fieldset } from 'src/app-components/Label/Fieldset';
import { Lang } from 'src/features/language/Lang';
import { makeLikertChildId } from 'src/layout/Likert/Generator/makeLikertChildId';
import classes from 'src/layout/Likert/Summary/LikertSummaryComponent.module.css';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { HeadingLevel } from 'src/layout/common.generated';

export interface IDisplayLikertContainer {
  likertBaseId: string;
  divRef?: React.Ref<HTMLDivElement>;
  id?: string;
  renderLayoutComponent: (indexedId: string, baseId: string) => JSX.Element | null;
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
  renderLayoutComponent,
}: IDisplayLikertContainer) {
  const container = useItemWhenType(likertBaseId, 'Likert');
  const { title, summaryTitle } = container.textResourceBindings ?? {};
  const indexedId = useIndexedId(likertBaseId, true);
  const depth = NodesInternal.useSelector((state) => state.nodeData?.[indexedId]?.depth);
  const childId = makeLikertChildId(likertBaseId);
  const childIndexedId = useIndexedId(childId);

  if (typeof depth !== 'number') {
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
      data-componentid={childIndexedId}
      data-componentbaseid={childId}
    >
      <div
        ref={divRef}
        id={id || container.id}
        data-testid='display-group-container'
      >
        {renderLayoutComponent(childIndexedId, childId)}
      </div>
    </Fieldset>
  );
}
