import React from 'react';

import { Textarea } from '@digdir/designsystemet-react';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useCharacterLimit } from 'src/utils/inputUtils';
import type { PropsFromGenericComponent } from 'src/layout';

import 'src/styles/shared.css';

export type ITextAreaProps = Readonly<PropsFromGenericComponent<'TextArea'>>;

export function TextAreaComponent({ node, overrideDisplay, isValid }: ITextAreaProps) {
  const { langAsString } = useLanguage();
  const { id, readOnly, textResourceBindings, dataModelBindings, saveWhileTyping, autocomplete, maxLength } = node.item;
  const characterLimit = useCharacterLimit(maxLength);
  const {
    formData: { simpleBinding: value },
    setValue,
    debounce,
  } = useDataModelBindings(dataModelBindings, saveWhileTyping);

  return (
    <ComponentStructureWrapper
      node={node}
      label={{ ...node.item, renderLabelAs: 'label' }}
    >
      <Textarea
        id={id}
        onChange={(e) => setValue('simpleBinding', e.target.value)}
        onBlur={debounce}
        readOnly={readOnly}
        characterLimit={!readOnly ? characterLimit : undefined}
        error={!isValid}
        value={value}
        data-testid={id}
        aria-describedby={
          overrideDisplay?.renderedInTable !== true && textResourceBindings?.description
            ? `description-${id}`
            : undefined
        }
        aria-label={overrideDisplay?.renderedInTable === true ? langAsString(textResourceBindings?.title) : undefined}
        autoComplete={autocomplete}
        style={{ height: '150px' }}
      />
    </ComponentStructureWrapper>
  );
}
