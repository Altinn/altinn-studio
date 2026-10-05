import React from 'react';

import { Paragraph } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export function ParagraphComponent({ baseComponentId }: PropsFromGenericComponent<'Paragraph'>) {
  const config = useComponentConfig(baseComponentId, 'Paragraph');
  const componentId = useIndexedId(baseComponentId);
  const title = useEvalOptionalText(
    config.textResourceBindings?.title,
    Expressions.Paragraph.textResourceBindings.title,
  );
  const help = useEvalOptionalText(config.textResourceBindings?.help, Expressions.Paragraph.textResourceBindings.help);

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <Paragraph
        id={componentId}
        title={title}
        help={help}
      />
    </ComponentStructureWrapper>
  );
}
