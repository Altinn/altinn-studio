import React from 'react';

import { Number } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { getMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import { useResolvedFormatting } from 'src/layout/Input/formatting';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export const NumberComponent = ({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'Number'>) => {
  const config = useComponentConfig(baseComponentId, 'Number');
  const value = useEvalExpression(config.value, Expressions.Number.value);
  const resolvedTitle = useEvalExpression(
    config.textResourceBindings?.title,
    Expressions.Number.textResourceBindings.title,
  );
  const resolvedDescription = useEvalExpression(
    config.textResourceBindings?.description,
    Expressions.Number.textResourceBindings.description,
  );
  const resolvedHelp = useEvalExpression(
    config.textResourceBindings?.help,
    Expressions.Number.textResourceBindings.help,
  );
  const title = config.textResourceBindings?.title === undefined ? undefined : resolvedTitle;
  const description = config.textResourceBindings?.description === undefined ? undefined : resolvedDescription;
  const help = config.textResourceBindings?.help === undefined ? undefined : resolvedHelp;
  const formatting = useResolvedFormatting(config.formatting);
  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);
  const currentLanguage = useCurrentLanguage();

  const renderLabel = overrideDisplay?.renderLabel ?? true;
  const inTable = overrideDisplay?.renderedInTable === true;
  const showLabel = renderLabel && !inTable;
  const numberFormatting = getMapToReactNumberConfig(formatting, value.toString(), currentLanguage);

  return (
    <Number
      componentId={componentId}
      value={value}
      formatting={numberFormatting}
      title={title}
      description={showLabel ? description : undefined}
      help={showLabel ? help : undefined}
      hideLabel={!showLabel}
      icon={config.icon}
      direction={config.direction ?? 'horizontal'}
      labelGrid={config.grid?.labelGrid}
      innerGrid={innerGrid}
    />
  );
};
