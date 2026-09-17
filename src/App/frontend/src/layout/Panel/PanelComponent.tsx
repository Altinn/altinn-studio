import React from 'react';

import { ConditionalWrapper, FullWidthWrapper, Panel } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { FormStore } from 'src/features/form/FormContext';
import { Lang } from 'src/features/language/Lang';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export const PanelComponent = ({ baseComponentId }: PropsFromGenericComponent<'Panel'>) => {
  const config = useComponentConfig(baseComponentId, 'Panel');
  const body = useEvalExpression(config.textResourceBindings?.body, Expressions.Panel.textResourceBindings.body);
  const title = useEvalExpression(config.textResourceBindings?.title, Expressions.Panel.textResourceBindings.title);

  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
  const parent = layoutLookups.componentToParent[baseComponentId];
  const fullWidth = !config.grid && parent?.type === 'page';
  const childrenOfParent =
    (parent && parent?.type === 'page'
      ? layoutLookups.topLevelComponents[parent.id]
      : parent && layoutLookups.componentToChildren[parent.id]) ?? [];
  const isOnBottom = childrenOfParent.indexOf(baseComponentId) === childrenOfParent.length - 1;
  const isOnTop = childrenOfParent.indexOf(baseComponentId) === 0;
  if (
    !(config.textResourceBindings?.body === undefined ? undefined : body) &&
    !(config.textResourceBindings?.title === undefined ? undefined : title)
  ) {
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
          title={
            (config.textResourceBindings?.title === undefined ? undefined : title) ? (
              <Lang id={config.textResourceBindings?.title === undefined ? undefined : title} />
            ) : undefined
          }
          showIcon={config.showIcon ?? true}
          variant={config.variant ?? 'info'}
          forceMobileLayout={!fullWidth}
        >
          <Lang id={config.textResourceBindings?.body === undefined ? undefined : body} />
        </Panel>
      </ConditionalWrapper>
    </ComponentStructureWrapper>
  );
};
