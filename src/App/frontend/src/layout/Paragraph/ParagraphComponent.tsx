import React from 'react';

import { Paragraph } from '@app/form-component';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function ParagraphComponent({ baseComponentId }: PropsFromGenericComponent<'Paragraph'>) {
  const { id, textResourceBindings } = useItemWhenType(baseComponentId, 'Paragraph');
  const { lang, langAsString } = useLanguage();

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <Paragraph
        id={id}
        title={lang(textResourceBindings?.title)}
        titleText={langAsString(textResourceBindings?.title)}
        help={textResourceBindings?.help ? <Lang id={textResourceBindings?.help} /> : undefined}
      />
    </ComponentStructureWrapper>
  );
}
