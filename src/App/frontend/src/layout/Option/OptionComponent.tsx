import React from 'react';

import { Option } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { useGetOptions } from 'src/features/options/useGetOptions';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export const OptionComponent = ({ baseComponentId }: PropsFromGenericComponent<'Option'>) => {
  const config = useComponentConfig(baseComponentId, 'Option');
  const value = useEvalExpression(config.value, Expressions.Option.value);
  const title = useEvalExpression(config.textResourceBindings?.title, Expressions.Option.textResourceBindings.title);
  const description = useEvalExpression(
    config.textResourceBindings?.description,
    Expressions.Option.textResourceBindings.description,
  );
  const help = useEvalExpression(config.textResourceBindings?.help, Expressions.Option.textResourceBindings.help);

  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);
  const { options, isFetching } = useGetOptions(baseComponentId, 'single');
  const selectedOption = options.find((option) => option.value === value);
  return (
    <Option
      componentId={componentId}
      title={config.textResourceBindings?.title === undefined ? undefined : title}
      description={config.textResourceBindings?.description === undefined ? undefined : description}
      help={config.textResourceBindings?.help === undefined ? undefined : help}
      icon={config.icon}
      direction={config.direction ?? 'horizontal'}
      labelGrid={config.grid?.labelGrid}
      innerGrid={innerGrid}
      isLoading={isFetching}
      optionLabel={selectedOption?.label}
      optionHelp={selectedOption?.helpText}
      optionDescription={selectedOption?.description}
    />
  );
};
