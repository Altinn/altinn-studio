import React from 'react';

import { TextAreaLayout } from '@app/form-component';

import { FormStore } from 'src/features/form/FormContext';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useLabelData } from 'src/utils/layout/useLabelData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export type ITextAreaProps = Readonly<PropsFromGenericComponent<'TextArea'>>;

export function TextAreaComponent({ baseComponentId, overrideDisplay }: ITextAreaProps) {
  const { readOnly, dataModelBindings, saveWhileTyping, autocomplete, maxLength, grid } = useItemWhenType(
    baseComponentId,
    'TextArea',
  );

  const { setValue, formData } = useDataModelBindings(dataModelBindings, saveWhileTyping);
  const debounce = FormStore.data.useDebounceImmediately();
  const isValid = useIsValid(baseComponentId);

  const { title, help, description, required, showOptionalMarking } = useLabelData({
    baseComponentId,
    overrideDisplay,
  });
  const { componentId, innerGrid, validationGrid, showValidationMessages } = useComponentStructureData(baseComponentId);

  return (
    <TextAreaLayout
      componentId={componentId}
      value={formData.simpleBinding}
      onChange={(v) => setValue('simpleBinding', v)}
      onBlur={() => debounce('blur')}
      readOnly={readOnly}
      required={required}
      error={!isValid}
      maxLength={maxLength}
      autoComplete={autocomplete}
      title={title}
      help={help}
      description={description}
      showOptionalMarking={showOptionalMarking}
      labelGrid={grid?.labelGrid}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={
        showValidationMessages ? <AllComponentValidations baseComponentId={baseComponentId} /> : undefined
      }
    />
  );
}
