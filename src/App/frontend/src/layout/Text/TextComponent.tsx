import React from 'react';

import { Text } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export const TextComponent = ({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'Text'>) => {
  const config = useComponentConfig(baseComponentId, 'Text');
  const value = useEvalExpression(config.value, Expressions.Text.value);
  const title = useEvalExpression(config.textResourceBindings?.title, Expressions.Text.textResourceBindings.title);
  const description = useEvalExpression(
    config.textResourceBindings?.description,
    Expressions.Text.textResourceBindings.description,
  );
  const help = useEvalExpression(config.textResourceBindings?.help, Expressions.Text.textResourceBindings.help);

  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);
  const renderLabel = overrideDisplay?.renderLabel ?? true;
  const inTable = overrideDisplay?.renderedInTable === true;
  const showLabel = renderLabel && !inTable;
  return (
    <Text
      componentId={componentId}
      value={value}
      title={showLabel ? (config.textResourceBindings?.title === undefined ? undefined : title) : undefined}
      description={
        showLabel ? (config.textResourceBindings?.description === undefined ? undefined : description) : undefined
      }
      help={showLabel ? (config.textResourceBindings?.help === undefined ? undefined : help) : undefined}
      icon={config.icon}
      direction={config.direction ?? 'horizontal'}
      labelGrid={config.grid?.labelGrid}
      innerGrid={innerGrid}
    />
  );
};
