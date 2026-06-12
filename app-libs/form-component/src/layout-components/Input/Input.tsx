import React from 'react';
import type { HTMLInputAutoCompleteAttribute, ReactElement } from 'react';
import type { NumericFormatProps } from 'react-number-format';

import {
  FormattedInput,
  Input as InputField,
  Label,
  NumericInput,
} from '@app/form-component/app-components';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { HelpTextContainer } from '@app/form-component/layout-components/common/HelpTextContainer';
import {
  isNumberFormat,
  isPatternFormat,
} from '@app/form-component/layout-components/Input/number-format-helpers';
import type {
  IGridStyling,
  InputProps as InputFieldProps,
} from '@app/form-component/app-components';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type {
  NumberFormat,
  NumericConfig,
  PatternConfig,
} from '@app/form-component/layout-components/Input/number-format-helpers';

import classes from './Input.module.css';

type Variant =
  | { type: 'search' }
  | { type: 'text' }
  | { type: 'number'; format: NumericConfig }
  | { type: 'pattern'; format: PatternConfig };

function getVariantWithFormat(
  type: 'text' | 'search' | undefined,
  format: NumberFormat | undefined,
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
  autocomplete: HTMLInputAutoCompleteAttribute | undefined,
): Pick<InputFieldProps, 'inputMode' | 'pattern'> {
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

export interface InputLayoutProps {
  // Studio-configurable props.
  id: string;
  title?: string;
  description?: string;
  help?: string;
  prefix?: string;
  suffix?: string;
  variant?: 'text' | 'search';
  numberFormat?: NumberFormat;
  align?: 'left' | 'center' | 'right';
  autocomplete?: HTMLInputAutoCompleteAttribute;
  maxLength?: number;
  required?: boolean;
  readOnly?: boolean;
  showOptionalMarking?: boolean;
  grid?: IGridStyling;

  // Runtime wiring, injected by the wrapper.
  renderLabel?: boolean;
  renderedInTable?: boolean;
  rowReadOnly?: boolean;
  value?: string;
  error?: boolean;
  hasValidations?: boolean;
  validationsId?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
}

/**
 * Sorts each prop into a Storybook docs group. `satisfies PropCategories<InputLayoutProps>` makes it
 * exhaustive, so a new prop must be classified here.
 */
export const INPUT_PROP_CATEGORIES = {
  id: 'config',
  title: 'config',
  description: 'config',
  help: 'config',
  prefix: 'config',
  suffix: 'config',
  variant: 'config',
  numberFormat: 'config',
  align: 'config',
  autocomplete: 'config',
  maxLength: 'config',
  required: 'config',
  readOnly: 'config',
  showOptionalMarking: 'config',
  grid: 'config',
  renderLabel: 'runtime',
  renderedInTable: 'runtime',
  rowReadOnly: 'runtime',
  value: 'runtime',
  error: 'runtime',
  hasValidations: 'runtime',
  validationsId: 'runtime',
  onChange: 'runtime',
  onBlur: 'runtime',
} satisfies PropCategories<InputLayoutProps>;

function getLabelId(id: string) {
  return `label-${id}`;
}

function getDescriptionId(id: string) {
  return `description-${getLabelId(id)}`;
}

function buildAriaDescribedBy({
  renderedInTable,
  hasTitle,
  descriptionId,
  hasDescription,
  validationsId,
  hasValidations,
}: {
  renderedInTable?: boolean;
  hasTitle: boolean;
  descriptionId?: string;
  hasDescription: boolean;
  validationsId?: string;
  hasValidations: boolean;
}): string | undefined {
  if (renderedInTable === true || !hasTitle) {
    return undefined;
  }

  const ids: string[] = [];
  if (descriptionId && hasDescription) {
    ids.push(descriptionId);
  }
  if (validationsId && hasValidations) {
    ids.push(validationsId);
  }

  return ids.length > 0 ? ids.join(' ') : undefined;
}

export function InputLayout(props: InputLayoutProps) {
  const {
    id,
    title,
    description,
    help,
    prefix,
    suffix,
    variant: inputVariant,
    numberFormat,
    align,
    autocomplete,
    maxLength,
    required,
    readOnly,
    showOptionalMarking,
    grid,
    renderLabel = true,
    renderedInTable,
    rowReadOnly,
    value,
    error,
    hasValidations = false,
    validationsId,
    onChange,
    onBlur,
  } = props;

  // Transient display value for the number variant. While the user types trailing-zero decimals
  // (e.g. '123.000') the data layer normalises the committed value to '123', which flows back in via
  // `value` and would otherwise snap the field. We hold the user's input on screen until it differs
  // from the committed value by more than trailing zeros, or until blur clears it.
  const [pendingValue, setPendingValue] = React.useState<string | undefined>(undefined);
  const numberDisplayValue =
    pendingValue !== undefined &&
    pendingValue !== value &&
    pendingValue.replace(/[.,]0+$/, '') === value
      ? pendingValue
      : value;

  // react-number-format emits onValueChange both for user input and for prop-driven re-formatting
  // (e.g. a visual-only decimalScale change). We only forward genuine user edits.
  const handlePatternValueChange: NumericFormatProps['onValueChange'] = (values, sourceInfo) => {
    if (sourceInfo.source === 'prop') {
      return;
    }
    onChange?.(values.value);
  };

  const handleNumberValueChange: NumericFormatProps['onValueChange'] = (values, sourceInfo) => {
    if (sourceInfo.source === 'prop') {
      return;
    }
    setPendingValue(values.value);
    onChange?.(values.value);
  };

  const { lang, langAsString } = useTranslation();

  const labelId = getLabelId(id);
  const descriptionId = getDescriptionId(id);

  const variant = getVariantWithFormat(inputVariant, numberFormat);
  const { inputMode, pattern } = getMobileKeyboardProps(variant, autocomplete);

  const characterLimit: InputFieldProps['characterLimit'] =
    maxLength === undefined
      ? undefined
      : {
          limit: maxLength,
          under: langAsString('input_components.remaining_characters'),
          over: langAsString('input_components.exceeded_max_limit'),
        };

  // Kept separate from `inputProps` (and spread directly into each field) so the field's
  // `aria-label` / `aria-labelledby` discriminated union is preserved rather than widened.
  const labelProps: { 'aria-label': string } | { 'aria-labelledby': string } = title
    ? { 'aria-label': langAsString(title) }
    : { 'aria-labelledby': labelId };

  const inputProps = {
    id,
    'aria-describedby': buildAriaDescribedBy({
      renderedInTable,
      hasTitle: !!title,
      descriptionId,
      hasDescription: !!description,
      validationsId,
      hasValidations,
    }),
    autoComplete: autocomplete,
    className: align ? classes[`text-align-${align}`] : '',
    readOnly,
    textonly: rowReadOnly && readOnly,
    required,
    onBlur,
    error,
    prefix: prefix ? langAsString(prefix) : undefined,
    suffix: suffix ? langAsString(suffix) : undefined,
    style: { width: '100%' },
    inputMode,
    pattern,
  };

  const field = (() => {
    switch (variant.type) {
      case 'search':
      case 'text':
        return (
          <InputField
            {...inputProps}
            {...labelProps}
            value={value}
            type={variant.type}
            onChange={(event) => onChange?.(event.target.value)}
            characterLimit={characterLimit}
          />
        );
      case 'pattern':
        return (
          <FormattedInput
            {...inputProps}
            {...labelProps}
            {...variant.format}
            value={value}
            type='text'
            onValueChange={handlePatternValueChange}
            characterLimit={characterLimit}
          />
        );
      case 'number':
        return (
          <NumericInput
            {...inputProps}
            {...labelProps}
            {...variant.format}
            prefix={langAsString(variant.format.prefix ?? '')}
            suffix={langAsString(variant.format.suffix ?? '')}
            value={numberDisplayValue}
            type='text'
            onBlur={() => setPendingValue(undefined)}
            onValueChange={handleNumberValueChange}
            onPaste={(event: React.ClipboardEvent<HTMLInputElement>) => {
              // Workaround for a react-number-format bug that removes the decimal on paste, and for
              // Norwegian users pasting a comma decimal separator. Resolve when this is fixed:
              // https://github.com/s-yadav/react-number-format/issues/349
              event.preventDefault();
              if (readOnly) {
                return;
              }
              onChange?.(event.clipboardData.getData('Text').replace(',', '.'));
            }}
            characterLimit={characterLimit}
          />
        );
    }
  })();

  const shouldShowLabel = renderLabel && renderedInTable !== true && !!title;
  const labelText = shouldShowLabel ? lang(title) : undefined;

  const requiredIndicator: ReactElement | undefined = required ? (
    <span> {langAsString('form_filler.required_label')}</span>
  ) : undefined;

  const optionalIndicator: ReactElement | undefined =
    !required && showOptionalMarking && !readOnly ? (
      <span className={classes.optionalIndicator}>{` (${langAsString('general.optional')})`}</span>
    ) : undefined;

  const helpComponent: ReactElement | undefined = help ? (
    <HelpTextContainer id={id} title={title} helpText={lang(help)} />
  ) : undefined;

  const descriptionComponent: ReactElement | undefined = description ? (
    <span id={descriptionId} data-testid={descriptionId}>
      {lang(description)}
    </span>
  ) : undefined;

  return (
    <Label
      id={labelId}
      htmlFor={id}
      label={labelText as ReactElement | string | undefined}
      grid={grid}
      required={required}
      requiredIndicator={requiredIndicator}
      optionalIndicator={optionalIndicator}
      help={helpComponent}
      description={descriptionComponent}
    >
      {field}
    </Label>
  );
}
