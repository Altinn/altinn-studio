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

  const titleContent = lang(textResourceBindings?.title);
  const titleIsInline =
    !!titleContent && typeof titleContent === 'object' && 'type' in titleContent && titleContent.type === 'span';

  const titleKey = textResourceBindings?.title;
  const helpKey = textResourceBindings?.help;

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <Paragraph
        id={id}
        title={titleContent}
        titleIsInline={titleIsInline}
        helpText={helpKey ? <Lang id={helpKey} /> : undefined}
        helpTitle={titleKey ? langAsString(titleKey) : langAsString('helptext.button_title')}
        helpTitlePrefix={titleKey ? langAsString('helptext.button_title_prefix') : undefined}
      />
    </ComponentStructureWrapper>
  );
}
