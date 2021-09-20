import * as React from 'react';
import classNames from 'classnames';
import NumberFormat, { NumberFormatProps } from 'react-number-format';
import { Input } from '@material-ui/core';

import '../../styles/shared.css';

export interface IInputBaseProps {
  id: string;
  readOnly: boolean;
  required: boolean;
  formatting?: IInputFormatting;
  handleDataChange: (value: any) => void;
}

export interface IInputFormatting {
  number?: NumberFormatProps;
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
      isNumericString={true}
      {...formatting.number}
    />
  );
}

export function BasicInputComponent(props: IBasicInputProps) {
  return (
    <>
      <input
        data-testid={props.id}
        {...props}
      />
    </>
  );
}

export function InputComponent(props: IInputProps) {
  const [value, setValue] = React.useState(props.formData ? props.formData : '');
  const {
    id,
    readOnly,
    required,
    isValid,
    formData,
    formatting,
    handleDataChange,
  } = props;

  React.useEffect(() => {
    setValue(formData || '');
  }, [formData]);

  const onDataChanged = (e: any) => {
    setValue(e.target.value);
  };

  const onDataChangeSubmit = () => {
    handleDataChange(value);
  };

  return (
    <Input
      key={`input_${id}`}
      id={id}
      onBlur={onDataChangeSubmit}
      onChange={onDataChanged}
      readOnly={readOnly}
      required={required}
      fullWidth={true}
      disableUnderline={true}
      value={value}
      aria-describedby={`description-${props.id}`}
      inputComponent={formatting?.number ? NumberFormatCustom : BasicInputComponent}
      inputProps={{
        formatting,
        className: classNames('form-control', { 'validation-error': !isValid, disabled: readOnly }),
      }}
    />
  );
}
