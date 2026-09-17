import React from 'react';

import { Text } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalExpression, useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export const TextComponent = ({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'Text'>) => {
  const config = useComponentConfig(baseComponentId, 'Text');
  const value = useEvalExpression(config.value, Expressions.Text.value);
  const title = useEvalOptionalText(config.textResourceBindings?.title, Expressions.Text.textResourceBindings.title);
  const description = useEvalOptionalText(
    config.textResourceBindings?.description,
    Expressions.Text.textResourceBindings.description,
  );
  const help = useEvalOptionalText(config.textResourceBindings?.help, Expressions.Text.textResourceBindings.help);

  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);
  const renderLabel = overrideDisplay?.renderLabel ?? true;
  const inTable = overrideDisplay?.renderedInTable === true;
  const showLabel = renderLabel && !inTable;
  return (
    <Text
      componentId={componentId}
      value={value}
      title={showLabel ? title : undefined}
      description={showLabel ? description : undefined}
      help={showLabel ? help : undefined}
      icon={config.icon}
      direction={config.direction ?? 'horizontal'}
      labelGrid={config.grid?.labelGrid}
      innerGrid={innerGrid}
    />
  );
};
