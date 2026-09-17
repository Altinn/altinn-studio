import React from 'react';

import { Paragraph } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export function ParagraphComponent({ baseComponentId }: PropsFromGenericComponent<'Paragraph'>) {
  const config = useComponentConfig(baseComponentId, 'Paragraph');
  const componentId = useIndexedId(baseComponentId);
  const title = useEvalExpression(config.textResourceBindings?.title, Expressions.Paragraph.textResourceBindings.title);
  const help = useEvalExpression(config.textResourceBindings?.help, Expressions.Paragraph.textResourceBindings.help);

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <Paragraph
        id={componentId}
        title={config.textResourceBindings?.title === undefined ? undefined : title}
        help={config.textResourceBindings?.help === undefined ? undefined : help}
      />
    </ComponentStructureWrapper>
  );
}
