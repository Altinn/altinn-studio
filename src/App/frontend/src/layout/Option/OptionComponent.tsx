import React from 'react';

import { Option } from '@app/form-component';

import { useGetOptions } from 'src/features/options/useGetOptions';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const OptionComponent = ({ baseComponentId }: PropsFromGenericComponent<'Option'>) => {
  const { textResourceBindings, icon, value, direction, grid } = useItemWhenType(baseComponentId, 'Option');
  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);
  const { options, isFetching } = useGetOptions(baseComponentId, 'single');
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Option
      componentId={componentId}
      title={textResourceBindings?.title}
      description={textResourceBindings?.description}
      help={textResourceBindings?.help}
      icon={icon}
      direction={direction ?? 'horizontal'}
      labelGrid={grid?.labelGrid}
      innerGrid={innerGrid}
      isLoading={isFetching}
      optionLabel={selectedOption?.label}
      optionHelp={selectedOption?.helpText}
      optionDescription={selectedOption?.description}
    />
  );
};
