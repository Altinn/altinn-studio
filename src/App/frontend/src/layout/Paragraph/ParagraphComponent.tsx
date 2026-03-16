import React from 'react';

import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import { Lang, LangAsParagraph } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/Paragraph/ParagraphComponent.module.css';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function ParagraphComponent({ baseComponentId }: PropsFromGenericComponent<'Paragraph'>) {
  const { id, textResourceBindings } = useItemWhenType(baseComponentId, 'Paragraph');
  const { langAsString } = useLanguage();

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <div className={classes.paragraphWrapper}>
        <div
          id={id}
          data-testid={`paragraph-component-${id}`}
        >
          <LangAsParagraph id={textResourceBindings?.title} />
        </div>
        {textResourceBindings?.help && (
          <HelpTextContainer
            id={id}
            helpText={<Lang id={textResourceBindings?.help} />}
            title={langAsString(textResourceBindings?.title)}
          />
        )}
      </div>
    </ComponentStructureWrapper>
  );
}
