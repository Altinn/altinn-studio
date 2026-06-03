import React from 'react';
import type { HTMLInputAutoCompleteAttribute, ReactElement } from 'react';
import type { NumericFormatProps, PatternFormatProps } from 'react-number-format';

// this eslint-disables will be fixed once this PR is merged:
// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import {
  FormattedInput,
  HelpText,
  Input as InputField,
  Label,
  NumericInput,
} from '../../app-components';
// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { useTranslation } from '../../LanguageTranslatorProvider';
import classes from './Input.module.css';
// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import type { IGridStyling, InputProps as InputFieldProps } from '../../app-components';

// `size`/`customInput` are owned by the underlying field components, and the label/aria props are
// driven by the layout component itself. They are omitted here so spreading the config does not
// clash with the field's `size` prop or re-widen its `aria-label`/`aria-labelledby` union.
type OmittedFieldKeys = 'size' | 'customInput' | 'aria-label' | 'aria-labelledby' | 'label';
type NumericConfig = Omit<NumericFormatProps, OmittedFieldKeys>;
type PatternConfig = Omit<PatternFormatProps, OmittedFieldKeys>;

/** The resolved react-number-format config (i.e. the `formatting.number` part). */
export type NumberFormat = NumericConfig | PatternConfig;

const isPatternFormat = (format: NumberFormat | undefined): format is PatternConfig =>
  format ? (format as PatternConfig).format !== undefined : false;

const isNumberFormat = (format: NumberFormat | undefined): format is NumericConfig =>
  format ? (format as PatternConfig).format === undefined : false;

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

/**
 * Props that map 1:1 to the component's Studio-configurable options. These are the props an app
 * developer documents and experiments with in Storybook — see {@link INPUT_LAYOUT_CONFIG_KEYS}.
 */
export interface InputLayoutConfig {
  /** The component id. */
  id: string;
  /** Text-resource key for the field label. */
  title?: string;
  /** Text-resource key for the description shown below the label. */
  description?: string;
  /** Text-resource key for the help text shown in a tooltip next to the label. */
  help?: string;
  /** Text-resource key for the prefix shown before the input value. */
  prefix?: string;
  /** Text-resource key for the suffix shown after the input value. */
  suffix?: string;
  /** Variant of the input field. Number/pattern formatting is driven by `numberFormat`. */
  variant?: 'text' | 'search';
  /** Resolved react-number-format config. When set, the field renders as a numeric or pattern input. */
  numberFormat?: NumberFormat;
  /** Text alignment of the value inside the field. */
  align?: 'left' | 'center' | 'right';
  /** The HTML autocomplete attribute. */
  autocomplete?: HTMLInputAutoCompleteAttribute;
  /** Adds a remaining-characters counter to the field. */
  maxLength?: number;
  /** Whether the field is required. */
  required?: boolean;
  /** Whether the field is read-only. */
  readOnly?: boolean;
  /** Whether to render an "(optional)" marking when the field is not required. */
  showOptionalMarking?: boolean;
  /** Grid sizing for the label. */
  grid?: IGridStyling;
}

/**
 * Internal wiring supplied by the runtime wrapper: data binding, display overrides, validation
 * state and event handlers. These are intentionally NOT part of the Studio configuration and are
 * hidden from the Storybook controls (only {@link INPUT_LAYOUT_CONFIG_KEYS} are shown).
 */
export interface InputLayoutControlProps {
  /** Whether the label should be rendered (defaults to true). */
  renderLabel?: boolean;
  /** When rendered inside a table cell the label is hidden and aria wiring changes. */
  renderedInTable?: boolean;
  /** When the surrounding row is read-only, render the value as plain text. */
  rowReadOnly?: boolean;
  /** The current value of the field. */
  value?: string;
  /** Whether the field is in an error state. */
  error?: boolean;
  /** Whether there are validation messages associated with the field. */
  hasValidations?: boolean;
  /** The id of the element holding validation messages, used for aria-describedby. */
  validationsId?: string;
  /** Change handler for the text/search variants. */
  onChange?: InputFieldProps['onChange'];
  /** Value-change handler for the number/pattern variants. */
  onValueChange?: NumericFormatProps['onValueChange'];
  /** Blur handler for the text/search/pattern variants. */
  onBlur?: () => void;
  /** Blur handler for the number variant (used to commit/clear the in-progress value). */
  onNumberBlur?: () => void;
  /** Paste handler for the number variant. */
  onPaste?: (event: React.ClipboardEvent<HTMLInputElement>) => void;
}

export interface InputLayoutProps extends InputLayoutConfig, InputLayoutControlProps {}

/**
 * The configurable props, derived from {@link InputLayoutConfig}. The `satisfies Record<...>` keeps
 * this list exhaustive: adding a prop to `InputLayoutConfig` without listing it here is a compile
 * error. Storybook uses it (`controls.include`) to show controls for exactly the configurable props
 * and nothing else.
 */
export const INPUT_LAYOUT_CONFIG_KEYS = Object.keys({
  id: true,
  title: true,
  description: true,
  help: true,
  prefix: true,
  suffix: true,
  variant: true,
  numberFormat: true,
  align: true,
  autocomplete: true,
  maxLength: true,
  required: true,
  readOnly: true,
  showOptionalMarking: true,
  grid: true,
} satisfies Record<keyof InputLayoutConfig, true>) as (keyof InputLayoutConfig)[];

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
    onValueChange,
    onBlur,
    onNumberBlur,
    onPaste,
  } = props;

  const { lang, translate, TranslateComponent } = useTranslation();

  const labelId = getLabelId(id);
  const descriptionId = getDescriptionId(id);

  const variant = getVariantWithFormat(inputVariant, numberFormat);
  const { inputMode, pattern } = getMobileKeyboardProps(variant, autocomplete);

  const characterLimit: InputFieldProps['characterLimit'] =
    maxLength === undefined
      ? undefined
      : {
          limit: maxLength,
          under: translate('input_components.remaining_characters'),
          over: translate('input_components.exceeded_max_limit'),
        };

  // Kept separate from `inputProps` (and spread directly into each field) so the field's
  // `aria-label` / `aria-labelledby` discriminated union is preserved rather than widened.
  const labelProps: { 'aria-label': string } | { 'aria-labelledby': string } = title
    ? { 'aria-label': translate(title) }
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
    prefix: prefix ? translate(prefix) : undefined,
    suffix: suffix ? translate(suffix) : undefined,
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
            onChange={onChange}
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
            onValueChange={onValueChange}
            characterLimit={characterLimit}
          />
        );
      case 'number':
        return (
          <NumericInput
            {...inputProps}
            {...labelProps}
            {...variant.format}
            prefix={translate(variant.format.prefix ?? '')}
            suffix={translate(variant.format.suffix ?? '')}
            value={value}
            type='text'
            onBlur={onNumberBlur}
            onValueChange={onValueChange}
            onPaste={onPaste}
            characterLimit={characterLimit}
          />
        );
    }
  })();

  const shouldShowLabel = renderLabel && renderedInTable !== true && !!title;
  const labelText = shouldShowLabel ? lang(title) : undefined;

  const requiredIndicator: ReactElement | undefined = required ? (
    <span> {translate('form_filler.required_label')}</span>
  ) : undefined;

  const optionalIndicator: ReactElement | undefined =
    !required && showOptionalMarking && !readOnly ? (
      <span className={classes.optionalIndicator}>{` (${translate('general.optional')})`}</span>
    ) : undefined;

  const helpComponent: ReactElement | undefined = help ? (
    <HelpText
      id={`${id}-helptext`}
      titlePrefix={title ? translate('helptext.button_title_prefix') : undefined}
      title={title ? translate(title) : translate('helptext.button_title')}
    >
      <TranslateComponent tKey={help} />
    </HelpText>
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
