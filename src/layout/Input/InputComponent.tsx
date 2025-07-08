import React from 'react';

import { FormattedInput } from 'src/app-components/Input/FormattedInput';
import { Input } from 'src/app-components/Input/Input';
import { NumericInput } from 'src/app-components/Input/NumericInput';
import { Label } from 'src/app-components/Label/Label';
import { getDescriptionId } from 'src/components/label/Label';
import { FD } from 'src/features/formData/FormDataWrite';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { useMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/Input/InputComponent.module.css';
import { isNumberFormat, isPatternFormat } from 'src/layout/Input/number-format-helpers';
import { useLabel } from 'src/utils/layout/useLabel';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { InputProps } from 'src/app-components/Input/Input';
import type { PropsFromGenericComponent } from 'src/layout';
import type {
  HTMLAutoCompleteValues,
  NumberFormatProps as NumberFormatPropsCG,
  PatternFormatProps as PatternFormatPropsCG,
} from 'src/layout/common.generated';

type NumberFormatProps = Omit<NumberFormatPropsCG, 'thousandSeparator' | 'decimalSeparator' | 'suffix' | 'prefix'> & {
  thousandSeparator?: boolean | string;
  decimalSeparator?: string;
  suffix?: string;
  prefix?: string;
};

type PatternFormatProps = Omit<PatternFormatPropsCG, 'format'> & {
  format: string;
};

type SearchVariant = { type: 'search' };
type TextVariant = { type: 'text' };
type NumberVariant = { type: 'number'; format: NumberFormatProps };
type PatternVariant = { type: 'pattern'; format: PatternFormatProps };
type Variant = SearchVariant | TextVariant | NumberVariant | PatternVariant;

function getVariantWithFormat(
  type: 'text' | 'search' | undefined,
  format: NumberFormatProps | PatternFormatProps | undefined,
): Variant {
  if (type === 'search') {
    return { type: 'search' };
  }
  if (isPatternFormat(format)) {
    return { type: 'pattern', format };
  }
  if (isNumberFormat(format)) {
    return { type: 'number', format };
  }
  return { type: 'text' };
}

function getMobileKeyboardProps(
  variant: Variant,
  autocomplete: HTMLAutoCompleteValues | undefined,
): Pick<InputProps, 'inputMode' | 'pattern'> {
  if (variant.type === 'search') {
    return { inputMode: 'search', pattern: undefined };
  }

  if (autocomplete === 'email') {
    return { inputMode: 'email', pattern: undefined };
  }

  if (autocomplete === 'url' || autocomplete === 'photo') {
    return { inputMode: 'url', pattern: undefined };
  }

  if (autocomplete === 'tel') {
    return { inputMode: 'tel', pattern: '[-+()0-9]*' };
  }

  if (variant.type === 'pattern') {
    // Pattern inputs are simple. They fill out spaces or separators for you automatically, so the user can focus on
    // typing the numbers.
    return { inputMode: 'numeric', pattern: undefined };
  }

  if (variant.type === 'number') {
    if (variant.format.allowNegative === false) {
      return { inputMode: 'decimal', pattern: `[0-9,.]*` };
    }

    if (navigator?.platform && /iPhone|iPad/.test(navigator.platform)) {
      // Decimal on iOS does not allow negative numbers, so we have to fall back to text
      // when negatives are allowed. For more details, see the issue:
      // https://github.com/s-yadav/react-number-format/issues/189#issuecomment-623267349
      return { inputMode: 'text', pattern: `-?[0-9,.]*` };
    }

    return { inputMode: 'decimal', pattern: `-?[0-9,.]*` };
  }

  return { inputMode: 'text', pattern: undefined };
}

export const InputVariant = ({
  baseComponentId,
  overrideDisplay,
}: Pick<PropsFromGenericComponent<'Input'>, 'baseComponentId' | 'overrideDisplay'>) => {
  const {
    id,
    readOnly,
    required,
    formatting,
    variant: inputVariant,
    textResourceBindings,
    dataModelBindings,
    saveWhileTyping,
    autocomplete,
    maxLength,
  } = useItemWhenType(baseComponentId, 'Input');
  const {
    formData: { simpleBinding: realFormValue },
    setValue,
  } = useDataModelBindings(dataModelBindings, saveWhileTyping);
  const { langAsString } = useLanguage();

  const [localValue, setLocalValue] = React.useState<string | undefined>(undefined);
  const formValue = localValue ?? realFormValue;
  const reactNumberFormatConfig = useMapToReactNumberConfig(formatting, formValue);
  const variant = getVariantWithFormat(inputVariant, reactNumberFormatConfig?.number);
  const { inputMode, pattern } = getMobileKeyboardProps(variant, autocomplete);

  const inputProps: InputProps = {
    id,
    'aria-label': langAsString(textResourceBindings?.title),
    'aria-describedby':
      textResourceBindings?.title && textResourceBindings?.description ? getDescriptionId(id) : undefined,
    autoComplete: autocomplete,
    className: formatting?.align ? classes[`text-align-${formatting.align}`] : '',
    readOnly,
    textonly: overrideDisplay?.rowReadOnly && readOnly,
    required,
    onBlur: FD.useDebounceImmediately(),
    error: !useIsValid(baseComponentId),
    prefix: textResourceBindings?.prefix ? langAsString(textResourceBindings.prefix) : undefined,
    suffix: textResourceBindings?.suffix ? langAsString(textResourceBindings.suffix) : undefined,
    style: { width: '100%' },
    inputMode,
    pattern,
  };

  switch (variant.type) {
    case 'search':
    case 'text':
      return (
        <Input
          {...inputProps}
          value={formValue}
          type={variant.type}
          onChange={(event) => {
            setValue('simpleBinding', event.target.value);
          }}
          maxLength={maxLength}
        />
      );
    case 'pattern':
      return (
        <FormattedInput
          {...inputProps}
          {...variant.format}
          value={formValue}
          type='text'
          onValueChange={(values, sourceInfo) => {
            if (sourceInfo.source === 'prop') {
              return;
            }
            setValue('simpleBinding', values.value);
          }}
          maxLength={maxLength}
        />
      );
    case 'number':
      return (
        <NumericInput
          {...inputProps}
          {...variant.format}
          value={formValue}
          type='text'
          onBlur={() => {
            setLocalValue(undefined);
          }}
          onValueChange={(values, sourceInfo) => {
            if (sourceInfo.source === 'prop') {
              // Do not update the value if the change is from props (i.e. let's not send form data updates when
              // visual-only decimalScale changes)
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
          onPaste={(event: React.ClipboardEvent<HTMLInputElement>) => {
            /* This is a workaround for a react-number-format bug that
             * removes the decimal on paste.
             * We should be able to remove it when this issue gets fixed:
             * https://github.com/s-yadav/react-number-format/issues/349
             *  */
            event.preventDefault();
            if (inputProps.readOnly) {
              return;
            }
            const pastedText = event.clipboardData.getData('Text');
            if (pastedText.indexOf(',') !== -1) {
              setValue('simpleBinding', pastedText.replace(',', '.'));
            } else {
              setValue('simpleBinding', pastedText);
            }
          }}
          maxLength={maxLength}
        />
      );
  }
};

export const InputComponent: React.FunctionComponent<PropsFromGenericComponent<'Input'>> = ({
  baseComponentId,
  overrideDisplay,
}) => {
  const { grid, id, required } = useItemWhenType(baseComponentId, 'Input');

  const { labelText, getRequiredComponent, getOptionalComponent, getHelpTextComponent, getDescriptionComponent } =
    useLabel({ baseComponentId, overrideDisplay });

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
      <ComponentStructureWrapper baseComponentId={baseComponentId}>
        <InputVariant
          baseComponentId={baseComponentId}
          overrideDisplay={overrideDisplay}
        />
      </ComponentStructureWrapper>
    </Label>
  );
};
