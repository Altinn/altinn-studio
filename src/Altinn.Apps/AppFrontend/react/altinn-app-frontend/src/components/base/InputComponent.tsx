import * as React from 'react';
import '../../styles/shared.css';
import classNames from 'classnames';
import NumberFormat from 'react-number-format';
import { Input } from '@material-ui/core';

export interface IInputBaseProps {
  id: string;
  readOnly: boolean;
  required: boolean;
  formatting?: any;
  handleDataChange: (value: any) => void;
}

export interface IInputProps extends IInputBaseProps {
  formData: any;
  isValid?: boolean
}

export interface IBasicInputProps extends IInputBaseProps {
  onDataChangeSubmit: () => void;
  onDataChanged: (e: any) => void;
  value: string;
}

export interface IFormattedNumberInputProps extends IInputBaseProps {
  inputRef: ((el: HTMLInputElement) => void) | React.Ref<any>;
  name: any;
  onChange: (e: any) => void;
}

function NumberFormatCustom(props: IFormattedNumberInputProps) {
  const {
    inputRef,
    onChange,
    formatting,
    ...rest
  } = props;

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
      {...formatting}
    />
  );
}

export function BasicInputComponent(props: IBasicInputProps) {
  const { formatting, ...rest } = props;
  return (
    <>
      <input
        data-testid={props.id}
        {...rest}
        {...formatting}
      />
    </>
  );
}

export function InputComponent(props: IInputProps) {
  const [value, setValue] = React.useState(props.formData ? props.formData : '');
  const { number, ...formatting } = props.formatting || {};

  React.useEffect(() => {
    setValue(props.formData ? props.formData : '');
  }, [props.formData]);

  const onDataChanged = (e: any) => {
    setValue(e.target.value);
  };

  const onDataChangeSubmit = () => {
    props.handleDataChange(value);
  };

  return (
    <Input
      key={`input_${props.id}`}
      id={props.id}
      onBlur={onDataChangeSubmit}
      onChange={onDataChanged}
      readOnly={props.readOnly}
      required={props.required}
      className={classNames('form-control',
        { 'validation-error': !props.isValid, disabled: props.readOnly })}
      value={value}
      aria-describedby={`description-${props.id}`}
      inputComponent={number ? NumberFormatCustom : BasicInputComponent}
      inputProps={{ formatting }}
    />
  );
}
