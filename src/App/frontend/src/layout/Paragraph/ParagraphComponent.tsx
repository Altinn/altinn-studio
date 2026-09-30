import React from 'react';

import { Paragraph } from '@app/form-component';

import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function ParagraphComponent({ baseComponentId }: PropsFromGenericComponent<'Paragraph'>) {
  const { id, textResourceBindings } = useItemWhenType(baseComponentId, 'Paragraph');

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <Paragraph
        id={id}
        title={textResourceBindings?.title}
        help={textResourceBindings?.help}
      />
    </ComponentStructureWrapper>
  );
}
