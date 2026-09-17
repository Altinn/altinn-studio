import React from 'react';

import { TextAreaLayout } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { FormStore } from 'src/features/form/FormContext';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useLanguage } from 'src/features/language/useLanguage';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalExpression, useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import { useLabelData } from 'src/utils/layout/useLabelData';
import type { PropsFromGenericComponent } from 'src/layout';

export type ITextAreaProps = Readonly<PropsFromGenericComponent<'TextArea'>>;

export function TextAreaComponent({ baseComponentId, overrideDisplay }: ITextAreaProps) {
  const { langAsString } = useLanguage();
  const config = useComponentConfig(baseComponentId, 'TextArea');
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'TextArea');
  const readOnly = useEvalExpression(config.readOnly, Expressions.TextArea.readOnly);
  const resolvedTitle = useEvalOptionalText(
    config.textResourceBindings?.title,
    Expressions.TextArea.textResourceBindings.title,
  );

  const { setValue, formData } = useDataModelBindings(dataModelBindings, config.saveWhileTyping);
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
      maxLength={config.maxLength}
      autoComplete={config.autocomplete}
      title={title}
      ariaLabel={overrideDisplay?.renderedInTable === true && resolvedTitle ? langAsString(resolvedTitle) : undefined}
      help={help}
      description={description}
      showOptionalMarking={showOptionalMarking}
      labelGrid={config.grid?.labelGrid}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={
        showValidationMessages ? <AllComponentValidations baseComponentId={baseComponentId} /> : undefined
      }
    />
  );
}
