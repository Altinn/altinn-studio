import React, { type ChangeEvent, useId, useState } from 'react';

import { FormComponentActionType } from '@app/form-component/types/FormComponentActionType';
import type { FormComponentProps } from '@app/form-component/types/FormComponentProps';

export function FormComponent({
  title,
  dataModelBinding,
  onAction,
}: FormComponentProps): React.ReactElement {
  const inputId = useId();
  const [value, setValue] = useState('');

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  };

  const handleSubmit = () => {
    onAction({
      type: FormComponentActionType.PatchDataModel,
      payload: { dataModelBinding, value },
    });
  };

  return (
    <>
      <label htmlFor={inputId}>{title}</label>
      <input id={inputId} type='text' value={value} onChange={handleChange} />
      <button type='button' onClick={handleSubmit}>
        Send inn
      </button>
    </>
  );
}
