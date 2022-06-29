import * as React from 'react';
import type { IComponentProps } from '..';

import '../../styles/shared.css';

export function TextAreaComponent({
  id,
  formData,
  readOnly,
  isValid,
  handleDataChange,
  textResourceBindings,
}: IComponentProps) {
  const suppliedValue = formData?.simpleBinding;

  const [value, setValue] = React.useState(suppliedValue ?? '');

  React.useEffect(() => {
    setValue(suppliedValue);
  }, [suppliedValue]);

  const onDataChanged = (e: any) => {
    setValue(e.target.value);
  };

  const onDataChangeSubmit = () => {
    handleDataChange(value);
  };

  return (
    <div className='a-form-group-items input-group p-0'>
      <textarea
        id={id}
        onBlur={onDataChangeSubmit}
        onChange={onDataChanged}
        readOnly={readOnly}
        style={{ resize: 'none' }} // This is prone to change soon, implemented inline until then. See issue #1116
        className={
          (isValid
            ? 'form-control a-textarea '
            : 'form-control a-textarea validation-error') +
          (readOnly ? ' disabled' : '')
        }
        value={value}
        data-testid={id}
        aria-describedby={
          textResourceBindings ? `description-${id}` : undefined
        }
      />
    </div>
  );
}
