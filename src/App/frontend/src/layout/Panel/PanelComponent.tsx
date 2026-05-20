import React from 'react';

import { Panel } from '@app/form-component';

import { ConditionalWrapper } from 'src/app-components/ConditionalWrapper/ConditionalWrapper';
import { FullWidthWrapper } from 'src/app-components/FullWidthWrapper/FullWidthWrapper';
import { FormStore } from 'src/features/form/FormContext';
import { Lang } from 'src/features/language/Lang';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const PanelComponent = ({ baseComponentId }: PropsFromGenericComponent<'Panel'>) => {
  const { textResourceBindings, variant, showIcon, grid } = useItemWhenType(baseComponentId, 'Panel');
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
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
      <ConditionalWrapper
        condition={fullWidth}
        wrapper={(child) => (
          <FullWidthWrapper
            isOnBottom={isOnBottom}
            isOnTop={isOnTop}
          >
            {child}
          </FullWidthWrapper>
        )}
      >
        <Panel
          title={textResourceBindings.title ? <Lang id={textResourceBindings.title} /> : undefined}
          showIcon={showIcon ?? true}
          variant={variant ?? 'info'}
          forceMobileLayout={!fullWidth}
        >
          <Lang id={textResourceBindings.body} />
        </Panel>
      </ConditionalWrapper>
    </ComponentStructureWrapper>
  );
};
