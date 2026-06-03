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

  const [localValue, setLocalValue] = React.useState<string | undefined>(undefined);
  const formValue = localValue ?? realFormValue;
  const numberFormat = useMapToReactNumberConfig(formatting, formValue)?.number;
  const isPatternFormat = !!numberFormat && 'format' in numberFormat;

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
        value={formValue}
        error={!isValid}
        hasValidations={hasValidations}
        validationsId={`${baseComponentId}-validations`}
        onChange={(event) => {
          setValue('simpleBinding', event.target.value);
        }}
        onValueChange={(values, sourceInfo) => {
          if (sourceInfo.source === 'prop') {
            // Do not update the value if the change is from props (i.e. let's not send form data updates when
            // visual-only decimalScale changes)
            return;
          }
          if (isPatternFormat) {
            setValue('simpleBinding', values.value);
            return;
          }
          setValue('simpleBinding', values.value, (result) => {
            const noZeroesAfterComma = values.value.replace(/[.,]0+$/, '');
            const converted = typeof result === 'object' ? result.convertedValue?.toString() : undefined;
            const hasError = typeof result === 'object' ? result.error : true;
            if (
              !hasError &&
              converted !== undefined &&
              values.value !== converted &&
              noZeroesAfterComma === converted
            ) {
              // Use local state temporarily when the value can be converted to a number, but the user is not
              // yet sure if they're going to type more digits after zero-only decimals. I.e. they've typed
              // '123.000' or similar. This will be stored as '123'.
              setLocalValue(values.value);
            } else {
              setLocalValue(undefined);
            }
          });
        }}
        onBlur={() => debounce('blur')}
        onNumberBlur={() => setLocalValue(undefined)}
        onPaste={(event) => {
          /* This is a workaround for a react-number-format bug that
           * removes the decimal on paste.
           * We should be able to remove it when this issue gets fixed:
           * https://github.com/s-yadav/react-number-format/issues/349
           *  */
          event.preventDefault();
          if (readOnly) {
            return;
          }
          const pastedText = event.clipboardData.getData('Text');
          if (pastedText.indexOf(',') !== -1) {
            setValue('simpleBinding', pastedText.replace(',', '.'));
          } else {
            setValue('simpleBinding', pastedText);
          }
        }}
      />
    </ComponentStructureWrapper>
  );
}
