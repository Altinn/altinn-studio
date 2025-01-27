import React from 'react';

import { Paragraph } from '@digdir/designsystemet-react';

import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/Paragraph/ParagraphComponent.module.css';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export type IParagraphProps = PropsFromGenericComponent<'Paragraph'>;

export function ParagraphComponent({ node }: IParagraphProps) {
  const { id, textResourceBindings } = useNodeItem(node);
  const { lang, elementAsString } = useLanguage();
  const text = lang(textResourceBindings?.title);

  // The lang() function returns an object with a type property set to 'span'
  // if text contains inline-element(s) or just a string.
  const hasInlineContent = text && typeof text === 'object' && 'type' in text && text.type === 'span';

  return (
    <ComponentStructureWrapper node={node}>
      <div className={classes.paragraphWrapper}>
        <div
          id={id}
          data-testid={`paragraph-component-${id}`}
        >
          <Paragraph asChild={!hasInlineContent}>
            {!hasInlineContent ? (
              <div>
                <Lang
                  id={textResourceBindings?.title}
                  node={node}
                />
              </div>
            ) : (
              <Lang
                id={textResourceBindings?.title}
                node={node}
              />
            )}
          </Paragraph>
        </div>
        {textResourceBindings?.help && (
          <HelpTextContainer
            id={id}
            helpText={
              <Lang
                id={textResourceBindings?.help}
                node={node}
              />
            }
            title={elementAsString(text)}
          />
        )}
      </div>
    </ComponentStructureWrapper>
  );
}
