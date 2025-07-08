import React from 'react';

import { PANEL_VARIANT } from 'src/app-components/Panel/constants';
import { Panel } from 'src/app-components/Panel/Panel';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { Lang } from 'src/features/language/Lang';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const PanelComponent = ({ baseComponentId }: PropsFromGenericComponent<'Panel'>) => {
  const { textResourceBindings, variant, showIcon, grid } = useItemWhenType(baseComponentId, 'Panel');
  const layoutLookups = useLayoutLookups();
  const parent = layoutLookups.componentToParent[baseComponentId];
  const fullWidth = !grid && parent?.type === 'page';

  const childrenOfParent =
    (parent && parent?.type === 'page'
      ? layoutLookups.topLevelComponents[parent.id]
      : parent && layoutLookups.componentToChildren[parent.id]) ?? [];

  const isOnBottom = childrenOfParent.indexOf(baseComponentId) === childrenOfParent.length - 1;
  const isOnTop = childrenOfParent.indexOf(baseComponentId) === 0;

  if (!textResourceBindings?.body && !textResourceBindings?.title) {
    window.logWarn('Unable to render panel component: no text resource binding found.');
    return null;
  }

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <Panel
        title={textResourceBindings.title ? <Lang id={textResourceBindings.title} /> : undefined}
        showIcon={showIcon ?? true}
        variant={variant ?? PANEL_VARIANT.Info}
        forceMobileLayout={!fullWidth}
        isOnBottom={isOnBottom}
        isOnTop={isOnTop}
        fullWidth={fullWidth}
      >
        <Lang id={textResourceBindings.body} />
      </Panel>
    </ComponentStructureWrapper>
  );
};
