import * as React from 'react';
import { IComponentProps } from '..';
import '../../styles/shared.css';

export function TextAreaComponent(props: IComponentProps) {
  const formData = props.formData?.simpleBinding;

  const [value, setValue] = React.useState(
    formData ?? '',
  );

  React.useEffect(() => {
    setValue(formData);
  }, [formData]);

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
