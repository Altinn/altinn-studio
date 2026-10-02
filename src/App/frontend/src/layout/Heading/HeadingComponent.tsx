import React from 'react';

import { Heading } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export function HeadingComponent({ baseComponentId }: PropsFromGenericComponent<'Heading'>) {
  const config = useComponentConfig(baseComponentId, 'Heading');
  const title = useEvalOptionalText(config.textResourceBindings?.title, Expressions.Heading.textResourceBindings.title);
  const help = useEvalOptionalText(config.textResourceBindings?.help, Expressions.Heading.textResourceBindings.help);

  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);

  return (
    <Heading
      componentId={componentId}
      title={title}
      help={help}
      size={config.size}
      innerGrid={innerGrid}
    />
  );
}
