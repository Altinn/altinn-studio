import React from 'react';

import { Label } from 'src/app-components/Label/Label';
import { TextArea } from 'src/app-components/TextArea/TextArea';
import { getDescriptionId } from 'src/components/label/Label';
import { FD } from 'src/features/formData/FormDataWrite';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useCharacterLimit } from 'src/utils/inputUtils';
import { useLabel } from 'src/utils/layout/useLabel';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

import 'src/styles/shared.css';

export type ITextAreaProps = Readonly<PropsFromGenericComponent<'TextArea'>>;

export function TextAreaComponent({ node, overrideDisplay }: ITextAreaProps) {
  const { langAsString } = useLanguage();
  const isValid = useIsValid(node.baseId);
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
  } = useItemWhenType(node.baseId, 'TextArea');
  const characterLimit = useCharacterLimit(maxLength);
  const {
    formData: { simpleBinding: value },
    setValue,
  } = useDataModelBindings(dataModelBindings, saveWhileTyping);
  const debounce = FD.useDebounceImmediately();

  const { labelText, getRequiredComponent, getOptionalComponent, getHelpTextComponent, getDescriptionComponent } =
    useLabel({ baseComponentId: node.baseId, overrideDisplay });

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
        <TextArea
          id={id}
          value={value}
          onChange={(newValue) => setValue('simpleBinding', newValue)}
          onBlur={debounce}
          readOnly={readOnly}
          characterLimit={!readOnly ? characterLimit : undefined}
          error={!isValid}
          dataTestId={id}
          ariaDescribedBy={
            overrideDisplay?.renderedInTable !== true &&
            textResourceBindings?.title &&
            textResourceBindings?.description
              ? getDescriptionId(id)
              : undefined
          }
          ariaLabel={overrideDisplay?.renderedInTable === true ? langAsString(textResourceBindings?.title) : undefined}
          autoComplete={autocomplete}
          style={{ minHeight: '150px', height: '150px', width: '100%' }}
        />
      </ComponentStructureWrapper>
    </Label>
  );
}
