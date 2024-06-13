import React from 'react';
import { NumericFormat, PatternFormat } from 'react-number-format';

import { SearchField } from '@altinn/altinn-design-system';
import { Paragraph, Textfield } from '@digdir/designsystemet-react';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useLanguage } from 'src/features/language/useLanguage';
import { useMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import classes from 'src/layout/Input/InputComponent.module.css';
import { isNumericFormat, isPatternFormat } from 'src/layout/Input/number-format-helpers';
import { useCharacterLimit } from 'src/utils/inputUtils';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IInputFormattingInternal } from 'src/layout/Input/config.generated';

export type IInputProps = PropsFromGenericComponent<'Input'>;

import type { TextfieldProps } from '@digdir/designsystemet-react/dist/types/components/form/Textfield/Textfield';

interface InputComponentProps extends Omit<TextfieldProps, 'prefix' | 'suffix'> {
  textOnly?: boolean;
  prefixText?: string;
  suffixText?: string;
}

const TextOnly: React.FunctionComponent<TextfieldProps> = ({ className, id, value }) => {
  // If the value is null or empty string, we dont render anything to prevent an empty tabbable paragraph
  if (value === null) {
    return null;
  }

  if (typeof value === 'string' && value.length === 0) {
    return null;
  }

  return (
    <Paragraph
      id={id}
      size='small'
      className={`${classes['text-padding']} ${classes['focusable']}  ${className}`}
      tabIndex={0}
    >
      {value}
    </Paragraph>
  );
};

// We need to use this wrapped Textfield component because we have a conflict between the 'size' prop
// of the TextField and the react-number-format components which also have a 'size' prop
// The prefix/suffix props from the design system also conflicts with react-number-format
const TextfieldWrapped: React.FunctionComponent<InputComponentProps> = (props) => {
  const { size: _, textOnly, prefixText, suffixText, ...customProps } = props;

  if (textOnly) {
    return <TextOnly {...customProps}></TextOnly>;
  }

  return (
    <Textfield
      size={'small'}
      prefix={prefixText}
      suffix={suffixText}
      {...customProps}
    ></Textfield>
  );
};

export const InputComponent: React.FunctionComponent<IInputProps> = ({ node, isValid, overrideDisplay }) => {
  const {
    id,
    readOnly,
    required,
    formatting,
    variant,
    textResourceBindings,
    dataModelBindings,
    saveWhileTyping,
    autocomplete,
    maxLength,
  } = node.item;

  const {
    formData: { simpleBinding: formValue },
    setValue,
    debounce,
  } = useDataModelBindings(dataModelBindings, saveWhileTyping);

  const { langAsString } = useLanguage();

  const reactNumberFormatConfig = useMapToReactNumberConfig(
    formatting as IInputFormattingInternal | undefined,
    formValue,
  );
  const ariaLabel = overrideDisplay?.renderedInTable === true ? langAsString(textResourceBindings?.title) : undefined;
  const prefixText = textResourceBindings?.prefix ? langAsString(textResourceBindings.prefix) : undefined;
  const suffixText = textResourceBindings?.suffix ? langAsString(textResourceBindings.suffix) : undefined;
  const characterLimit = useCharacterLimit(maxLength);

  const commonProps = {
    'aria-label': ariaLabel,
    'aria-describedby': textResourceBindings?.description ? `description-${id}` : undefined,
    autoComplete: autocomplete,
    characterLimit: !readOnly ? characterLimit : undefined,
    role: 'textbox',
    className: reactNumberFormatConfig.align ? classes[`text-align-${reactNumberFormatConfig.align}`] : '',
    id,
    readOnly,
    error: !isValid,
    required,
    onBlur: debounce,
    textOnly: overrideDisplay?.rowReadOnly && readOnly,
    prefixText,
    suffixText,
  };

  if (variant === 'search') {
    return (
      <SearchField
        id={id}
        value={formValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('simpleBinding', e.target.value)}
        disabled={readOnly}
        aria-label={ariaLabel}
        aria-describedby={textResourceBindings?.description ? `description-${id}` : undefined}
        data-testid={`${id}-${variant}`}
        onBlur={debounce}
      />
    );
  }

  if (!reactNumberFormatConfig?.number) {
    return (
      <TextfieldWrapped
        value={formValue}
        onChange={(event) => {
          setValue('simpleBinding', event.target.value);
        }}
        data-testid={`${id}-${variant}`}
        {...commonProps}
      />
    );
  }

  if (isPatternFormat(reactNumberFormatConfig.number)) {
    return (
      <PatternFormat
        value={formValue}
        onValueChange={(values) => {
          setValue('simpleBinding', values.value);
        }}
        customInput={TextfieldWrapped as React.ComponentType}
        data-testid={`${id}-formatted-number-${variant}`}
        {...reactNumberFormatConfig.number}
        {...commonProps}
      />
    );
  }

  if (isNumericFormat(reactNumberFormatConfig.number)) {
    return (
      <NumericFormat
        value={formValue}
        onValueChange={(values) => {
          setValue('simpleBinding', values.value);
        }}
        onPaste={(event) => {
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
        customInput={TextfieldWrapped as React.ComponentType}
        data-testid={`${id}-formatted-number-${variant}`}
        {...reactNumberFormatConfig.number}
        {...commonProps}
      />
    );
  }
};
