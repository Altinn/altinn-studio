import * as React from 'react';
import '../../styles/shared.css';

export interface ITextAreaComponentProps {
  id: string;
  formData: any;
  handleDataChange: (value: any) => void;
  isValid?: boolean;
  readOnly: boolean;
}

export function TextAreaComponent(props: ITextAreaComponentProps) {
  const [value, setValue] = React.useState(
    props.formData ? props.formData : '',
  );

  React.useEffect(() => {
    setValue(props.formData);
  }, [props.formData]);

  const onDataChanged = (e: any) => {
    setValue(e.target.value);
  };

  const onDataChangeSubmit = () => {
    props.handleDataChange(value);
  };

  return (
    <div className='a-form-group-items input-group p-0'>
      <textarea
        id={props.id}
        onBlur={onDataChangeSubmit}
        onChange={onDataChanged}
        readOnly={props.readOnly}
        style={{ resize: 'none' }} // This is prone to change soon, implemented inline until then. See issue #1116
        className={
          (props.isValid
            ? 'form-control a-textarea '
            : 'form-control a-textarea validation-error') +
          (props.readOnly ? ' disabled' : '')
        }
        value={value}
        data-testid={props.id}
        aria-describedby={`description-${props.id}`}
      />
    </div>
  );
}
