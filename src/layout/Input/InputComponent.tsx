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
import { useCharacterLimit } from 'src/utils/inputUtils';
import { useLabel } from 'src/utils/layout/useLabel';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { InputProps } from 'src/app-components/Input/Input';
import type { PropsFromGenericComponent } from 'src/layout';
import type {
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

export type IInputProps = PropsFromGenericComponent<'Input'>;

export const InputVariant = ({ node, overrideDisplay }: Pick<IInputProps, 'node' | 'overrideDisplay'>) => {
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
  } = useNodeItem(node);
  const {
    formData: { simpleBinding: formValue },
    setValue,
  } = useDataModelBindings(dataModelBindings, saveWhileTyping);
  const { langAsString } = useLanguage();
  const characterLimit = useCharacterLimit(maxLength);

  const inputProps: InputProps = {
    id,
    'aria-label': overrideDisplay?.renderedInTable === true ? langAsString(textResourceBindings?.title) : undefined,
    'aria-describedby':
      textResourceBindings?.title && textResourceBindings?.description ? getDescriptionId(id) : undefined,
    autoComplete: autocomplete,
    className: formatting?.align ? classes[`text-align-${formatting.align}`] : '',
    readOnly,
    textonly: overrideDisplay?.rowReadOnly && readOnly,
    required,
    onBlur: FD.useDebounceImmediately(),
    error: !useIsValid(node),
    prefix: textResourceBindings?.prefix ? langAsString(textResourceBindings.prefix) : undefined,
    suffix: textResourceBindings?.suffix ? langAsString(textResourceBindings.suffix) : undefined,
    characterLimit: !readOnly ? characterLimit : undefined,
  };

  const reactNumberFormatConfig = useMapToReactNumberConfig(formatting, formValue);
  const variant = getVariantWithFormat(inputVariant, reactNumberFormatConfig?.number);

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
        />
      );
    case 'number':
      return (
        <NumericInput
          {...inputProps}
          {...variant.format}
          value={formValue}
          type='text'
          onValueChange={(values, sourceInfo) => {
            if (sourceInfo.source === 'prop') {
              // Do not update the value if the change is from props (i.e. let's not send form data updates when
              // visual-only decimalScale changes)
              return;
            }
            setValue('simpleBinding', values.value);
          }}
          onPaste={(event: React.ClipboardEvent<HTMLInputElement>) => {
            /* This is a workaround for a react-number-format bug that
             * removes the decimal on paste.
             * We should be able to remove it when this issue gets fixed:
             * https://github.com/s-yadav/react-number-format/issues/349
             *  */
            event.preventDefault();
            const pastedText = event.clipboardData.getData('Text');
            if (pastedText.indexOf(',') !== -1) {
              setValue('simpleBinding', pastedText.replace(',', '.'));
            } else {
              setValue('simpleBinding', pastedText);
            }
          }}
        />
      );
  }
};

export const InputComponent: React.FunctionComponent<IInputProps> = ({ node, overrideDisplay }) => {
  const { grid, id, required } = useNodeItem(node);

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
        <InputVariant
          node={node}
          overrideDisplay={overrideDisplay}
        />
      </ComponentStructureWrapper>
    </Label>
  );
};
