import React from 'react';

import { Textarea } from '@digdir/designsystemet-react';

import { Label } from 'src/app-components/Label/Label';
import { getDescriptionId } from 'src/components/label/Label';
import { FD } from 'src/features/formData/FormDataWrite';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useCharacterLimit } from 'src/utils/inputUtils';
import { useLabel } from 'src/utils/layout/useLabel';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

import 'src/styles/shared.css';

export type ITextAreaProps = Readonly<PropsFromGenericComponent<'TextArea'>>;

export function TextAreaComponent({ node, overrideDisplay }: ITextAreaProps) {
  const { langAsString } = useLanguage();
  const isValid = useIsValid(node);
  const {
    id,
    readOnly,
    textResourceBindings,
    dataModelBindings,
    saveWhileTyping,
    autocomplete,
    maxLength,
    grid,
    required,
  } = useNodeItem(node);
  const characterLimit = useCharacterLimit(maxLength);
  const {
    formData: { simpleBinding: value },
    setValue,
  } = useDataModelBindings(dataModelBindings, saveWhileTyping);
  const debounce = FD.useDebounceImmediately();

  const { labelText, getRequiredComponent, getOptionalComponent, getHelpTextComponent, getDescriptionComponent } =
    useLabel({ node, overrideDisplay });

  return (
    <Label
      htmlFor={id}
      label={labelText}
      grid={grid?.labelGrid}
      required={required}
      requiredIndicator={getRequiredComponent()}
      optionalIndicator={getOptionalComponent()}
      help={getHelpTextComponent()}
      description={getDescriptionComponent()}
    >
      <ComponentStructureWrapper node={node}>
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
            overrideDisplay?.renderedInTable !== true &&
            textResourceBindings?.title &&
            textResourceBindings?.description
              ? getDescriptionId(id)
              : undefined
          }
          aria-label={overrideDisplay?.renderedInTable === true ? langAsString(textResourceBindings?.title) : undefined}
          autoComplete={autocomplete}
          style={{ height: '150px' }}
        />
      </ComponentStructureWrapper>
    </Label>
  );
}
