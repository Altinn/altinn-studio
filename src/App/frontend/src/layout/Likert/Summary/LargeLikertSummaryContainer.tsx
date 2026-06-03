import React from 'react';
import type { JSX } from 'react';

import { Fieldset } from '@app/form-component';
import { Heading } from '@digdir/designsystemet-react';

import { FormStore } from 'src/features/form/FormContext';
import { Lang } from 'src/features/language/Lang';
import { makeLikertChildId } from 'src/layout/Likert/makeLikertChildId';
import classes from 'src/layout/Likert/Summary/LikertSummaryComponent.module.css';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useIsHidden } from 'src/utils/layout/hidden';
import { getLayoutDepth } from 'src/utils/layout/hierarchy';
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
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
  const depth = getLayoutDepth(likertBaseId, layoutLookups);
  const childId = makeLikertChildId(likertBaseId);
  const childIndexedId = useIndexedId(childId);
  const hidden = useIsHidden(childId);

  if (hidden) {
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
