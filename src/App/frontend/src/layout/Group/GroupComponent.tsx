import React from 'react';
import type { JSX } from 'react';

import { Heading } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { ConditionalWrapper } from 'src/app-components/ConditionalWrapper/ConditionalWrapper';
import { Fieldset } from 'src/app-components/Label/Fieldset';
import { Panel } from 'src/app-components/Panel/Panel';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/Group/GroupComponent.module.css';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useIsHidden } from 'src/utils/layout/hidden';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { HeadingLevel } from 'src/layout/common.generated';

export interface IGroupComponent {
  baseComponentId: string;
  containerDivRef?: React.Ref<HTMLDivElement>;
  id?: string;
  isSummary?: boolean;
  renderLayoutComponent: (baseComponentId: string) => JSX.Element | null;
}

const headingSizes: { [k in HeadingLevel]: Parameters<typeof Heading>[0]['data-size'] } = {
  [2]: 'sm',
  [3]: 'xs',
  [4]: '2xs',
  [5]: '2xs',
  [6]: '2xs',
};

export function GroupComponent({
  baseComponentId,
  containerDivRef,
  id,
  isSummary,
  renderLayoutComponent,
}: IGroupComponent) {
  const container = useItemWhenType(baseComponentId, 'Group');
  const { title, summaryTitle, description } = container.textResourceBindings ?? {};
  const isHidden = useIsHidden(baseComponentId);

  const indexedId = useIndexedId(baseComponentId);
  const depth = NodesInternal.useSelector((state) => state.nodeData?.[indexedId]?.depth);
  const layoutLookups = useLayoutLookups();

  console.log('GroupComponent:', { baseComponentId, indexedId, depth, isHidden, depthType: typeof depth });
  if (isHidden || typeof depth !== 'number') {
    console.log('GroupComponent returning null:', { baseComponentId, isHidden, depth });
    return null;
  }

  const parent = layoutLookups.componentToParent[baseComponentId];
  const isNested = parent?.type === 'node';
  const isPanel = container.groupingIndicator === 'panel';
  const isIndented = container.groupingIndicator === 'indented';
  const headingLevel = container.headingLevel ?? (Math.min(Math.max(depth + 1, 2), 6) as HeadingLevel);
  const headingSize = headingSizes[headingLevel];
  const legend = isSummary ? (summaryTitle ?? title) : title;

  return (
    <div className={cn(classes.groupWrapper, { [classes.panelWrapper]: isPanel, [classes.summary]: isSummary })}>
      <ConditionalWrapper
        condition={isPanel && !isSummary}
        wrapper={(child) => <Panel variant='info'>{child}</Panel>}
      >
        <Fieldset
          legend={
            legend ? (
              <Heading
                className={classes.legend}
                level={headingLevel}
                data-size={headingSize}
              >
                <Lang id={legend} />
              </Heading>
            ) : undefined
          }
          description={
            description && !isSummary ? (
              <span className={classes.description}>
                <Lang id={description} />
              </span>
            ) : undefined
          }
        >
          <div
            data-componentid={indexedId}
            data-componentbaseid={baseComponentId}
            ref={containerDivRef}
            id={id ?? indexedId}
            data-testid='display-group-container'
            className={cn(classes.groupContainer, {
              [classes.indented]: isIndented && !isNested,
            })}
          >
            {container.children.map((id) => renderLayoutComponent(id))}
          </div>
        </Fieldset>
      </ConditionalWrapper>
    </div>
  );
}
