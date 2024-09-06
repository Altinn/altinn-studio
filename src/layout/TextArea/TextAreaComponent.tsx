import React from 'react';

import { Textarea } from '@digdir/designsystemet-react';

import { FD } from 'src/features/formData/FormDataWrite';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useCharacterLimit } from 'src/utils/inputUtils';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

import 'src/styles/shared.css';

export type ITextAreaProps = Readonly<PropsFromGenericComponent<'TextArea'>>;

export function TextAreaComponent({ node, overrideDisplay }: ITextAreaProps) {
  const { langAsString } = useLanguage();
  const isValid = useIsValid(node);
  const { id, readOnly, textResourceBindings, dataModelBindings, saveWhileTyping, autocomplete, maxLength } =
    useNodeItem(node);
  const characterLimit = useCharacterLimit(maxLength);
  const {
    formData: { simpleBinding: value },
    setValue,
  } = useDataModelBindings(dataModelBindings, saveWhileTyping);
  const debounce = FD.useDebounceImmediately();

  return (
    <ComponentStructureWrapper
      node={node}
      label={{ node, renderLabelAs: 'label' }}
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
