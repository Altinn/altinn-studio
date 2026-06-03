import React from 'react';

import { InputLayout } from '@app/form-component';

import { FormStore } from 'src/features/form/FormContext';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { useMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function InputComponent({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'Input'>) {
  const {
    id,
    readOnly,
    required,
    grid,
    formatting,
    variant,
    textResourceBindings,
    dataModelBindings,
    saveWhileTyping,
    autocomplete,
    maxLength,
    labelSettings,
  } = useItemWhenType(baseComponentId, 'Input');

  const {
    formData: { simpleBinding: realFormValue },
    setValue,
  } = useDataModelBindings(dataModelBindings, saveWhileTyping);

  const numberFormat = useMapToReactNumberConfig(formatting, realFormValue)?.number;

  const debounce = FormStore.data.useDebounceImmediately();
  const isValid = useIsValid(baseComponentId);
  const hasValidations = useUnifiedValidationsForNode(baseComponentId).length > 0;

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <InputLayout
        id={id}
        title={textResourceBindings?.title}
        description={textResourceBindings?.description}
        help={textResourceBindings?.help}
        prefix={textResourceBindings?.prefix}
        suffix={textResourceBindings?.suffix}
        variant={variant}
        numberFormat={numberFormat}
        align={formatting?.align}
        autocomplete={autocomplete}
        maxLength={maxLength}
        required={required}
        readOnly={readOnly}
        showOptionalMarking={!!labelSettings?.optionalIndicator}
        grid={grid?.labelGrid}
        renderLabel={overrideDisplay?.renderLabel}
        renderedInTable={overrideDisplay?.renderedInTable}
        rowReadOnly={overrideDisplay?.rowReadOnly}
        value={realFormValue}
        error={!isValid}
        hasValidations={hasValidations}
        validationsId={`${baseComponentId}-validations`}
        onChange={(value) => setValue('simpleBinding', value)}
        onNumberChange={(value, reportResult) => {
          setValue('simpleBinding', value, (result) =>
            reportResult({
              convertedValue: typeof result === 'object' ? result.convertedValue?.toString() : undefined,
              error: typeof result === 'object' ? result.error : true,
            }),
          );
        }}
        onBlur={() => debounce('blur')}
      />
    </ComponentStructureWrapper>
  );
}
