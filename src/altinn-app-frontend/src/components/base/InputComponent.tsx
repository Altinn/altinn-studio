import * as React from 'react';
import classNames from 'classnames';
import type { NumberFormatProps } from 'react-number-format';
import NumberFormat from 'react-number-format';
import { Input, makeStyles } from '@material-ui/core';

import '../../styles/shared.css';
import type { IAutoSavedComponentProps } from '..';
import { useDelayedSavedState } from 'src/components/hooks/useDelayedSavedState';

export interface IInputBaseProps {
  id: string;
  readOnly: boolean;
  required: boolean;
  handleDataChange: (value: any) => void;
  inputRef?: ((el: HTMLInputElement) => void) | React.Ref<any>;
}

export interface IInputFormatting {
  number?: NumberFormatProps;
  align?: 'right' | 'center' | 'left';
}

export interface IInputProps extends IAutoSavedComponentProps {
  formatting?: IInputFormatting;
}

export interface IBasicInputProps extends IInputBaseProps {
  onDataChangeSubmit: () => void;
  onDataChanged: (e: any) => void;
  value: string;
}

export interface IFormattedNumberInputProps extends IInputBaseProps {
  name: any;
  onChange: (e: any) => void;
  formatting?: IInputFormatting;
}

const useStyles = makeStyles({
  input: {
    boxSizing: 'border-box',
  },
});

function NumberFormatCustom(props: IFormattedNumberInputProps) {
  const { inputRef, onChange, formatting, ...rest } = props;

  return (
    <NumberFormat
      {...rest}
      getInputRef={inputRef}
      data-testid={`${props.id}-formatted-number`}
      onValueChange={(values) => {
        onChange({
          target: {
            name: props.name,
            value: values.value,
          },
        });
      }}
      isNumericString={true}
      {...formatting.number}
    />
  );
}

export function BasicInputComponent({ inputRef, ...rest }: IBasicInputProps) {
  return (
    <>
      <input
        data-testid={rest.id}
        ref={inputRef}
        {...rest}
      />
    </>
  );
}

export function InputComponent({
  id,
  readOnly,
  required,
  isValid,
  formData,
  formatting,
  handleDataChange,
  textResourceBindings,
  saveWhileTyping,
}: IInputProps) {
  const classes = useStyles();
  const { value, setValue, saveValue, onPaste } = useDelayedSavedState(
    handleDataChange,
    formData?.simpleBinding ?? '',
    saveWhileTyping,
  );

  return (
    <Input
      key={`input_${id}`}
      id={id}
      onBlur={() => saveValue()}
      onChange={(e) => setValue(e.target.value)}
      onPaste={() => onPaste()}
      readOnly={readOnly}
      required={required}
      fullWidth={true}
      disableUnderline={true}
      value={value}
      aria-describedby={
        textResourceBindings?.description ? `description-${id}` : undefined
      }
      inputComponent={
        formatting?.number ? NumberFormatCustom : BasicInputComponent
      }
      inputProps={{
        formatting,
        className: classNames('form-control', classes.input, {
          'validation-error': !isValid,
          disabled: readOnly,
        }),
        style: {
          textAlign: formatting?.align,
        },
      }}
    />
  );
}
