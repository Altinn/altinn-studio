import React, { useId, useState, type ChangeEvent } from 'react';
import { FormComponentActionType } from '../types/FormComponentActionType';
import type { FormComponentProps } from '../types/FormComponentProps';

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
