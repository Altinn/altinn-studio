import * as React from 'react';
import '../../styles/shared.css';
import classNames from 'classnames';

export interface IInputProps {
  id: string;
  readOnly: boolean;
  required: boolean;
  formData: any;
  handleDataChange: (value: any) => void;
  isValid?: boolean;
  type?: string;
  title?: string;
}

export function InputComponent(props: IInputProps) {
  const [value, setValue] = React.useState(props.formData ? props.formData : '');

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
    <>
      <input
        key={`input_${props.id}`}
        id={props.id}
        type={props.type}
        onBlur={onDataChangeSubmit}
        onChange={onDataChanged}
        readOnly={props.readOnly}
        required={props.required}
        className={classNames('form-control',
          { 'validation-error': !props.isValid, disabled: props.readOnly })}
        value={value}
        data-testid={props.id}
        aria-describedby={`description-${props.id}`}
      />
    </>
  );
}
