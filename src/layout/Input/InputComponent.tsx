import React from 'react';
import { NumericFormat, PatternFormat } from 'react-number-format';

import { SearchField } from '@altinn/altinn-design-system';
import { Paragraph, Textfield } from '@digdir/design-system-react';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useLanguage } from 'src/features/language/useLanguage';
import { useMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import classes from 'src/layout/Input/InputComponent.module.css';
import { isNumericFormat, isPatternFormat } from 'src/layout/Input/number-format-helpers';
import { useCharacterLimit } from 'src/utils/inputUtils';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IInputFormatting } from 'src/layout/Input/config.generated';

export type IInputProps = PropsFromGenericComponent<'Input'>;

import type { TextfieldProps } from '@digdir/design-system-react/dist/types/components/form/Textfield/Textfield';

interface InputComponentProps extends TextfieldProps {
  textOnly?: boolean;
}

const TextOnly: React.FunctionComponent<TextfieldProps> = ({ className, id, value }) => (
  <Paragraph
    id={id}
    size='small'
    className={`${classes['text-padding']} ${className}`}
    tabindex='0'
  >
    {value}
  </Paragraph>
);

// We need to use this wrapped Textfield component because we have a conflict between the 'size' prop
// of the TextField and the react-number-format components which also have a 'size' prop
const TextfieldWrapped: React.FunctionComponent<InputComponentProps> = (props) => {
  const { size: _, textOnly, ...customProps } = props;

  if (textOnly) {
    return <TextOnly {...customProps}></TextOnly>;
  }

  return (
    <Textfield
      size={'small'}
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

  const reactNumberFormatConfig = useMapToReactNumberConfig(formatting as IInputFormatting | undefined, formValue);
  const ariaLabel = overrideDisplay?.renderedInTable === true ? langAsString(textResourceBindings?.title) : undefined;

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
        onPaste={(event: React.ClipboardEvent<HTMLInputElement>) => {
          /* This is a workaround for a react-number-format bug that
           * removes the decimal on paste.
           * We should be able to remove it when this issue gets fixed:
           * https://github.com/s-yadav/react-number-format/issues/349
           *  */
          const pastedText = event.clipboardData.getData('Text');
          event.preventDefault();
          setValue('simpleBinding', pastedText);
        }}
        customInput={TextfieldWrapped as React.ComponentType}
        data-testid={`${id}-formatted-number-${variant}`}
        {...reactNumberFormatConfig.number}
        {...commonProps}
      />
    );
  }
};
