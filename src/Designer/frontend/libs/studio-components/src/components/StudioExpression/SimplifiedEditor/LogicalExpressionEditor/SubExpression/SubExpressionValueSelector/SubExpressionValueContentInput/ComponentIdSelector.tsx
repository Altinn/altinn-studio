import type { Props } from './Props';
import type { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import React, { ChangeEventHandler, useState } from 'react';
import { useStudioExpressionContext } from '../../../../../StudioExpressionContext';
import { ExpressionErrorKey } from '../../../../../enums/ExpressionErrorKey';
import { DataLookupFuncName } from '../../../../../enums/DataLookupFuncName';
import { StudioSelect } from '../../../../../../StudioSelect';

export const ComponentIdSelector = ({
  value,
  onChange,
}: Props<SimpleSubexpressionValueType.Component>): React.ReactElement => {
  const { dataLookupOptions, texts } = useStudioExpressionContext();
  const options = dataLookupOptions[DataLookupFuncName.Component];
  const idValueExists = options.includes(value.id) || value.id === '';
  const [errorKey, setErrorKey] = useState<ExpressionErrorKey | null>(
    idValueExists ? null : ExpressionErrorKey.ComponentIDNoLongerExists,
  );
  const [idValue, setIdValue] = useState<string>(value.id);

  const handleChange: ChangeEventHandler<HTMLSelectElement> = (event) => {
    const id = event.target.value;
    setIdValue(id);
    onChange({ ...value, id });
    setErrorKey(null);
  };

  return (
    <StudioSelect
      error={errorKey === null ? undefined : texts.errorMessages[errorKey]}
      label={texts.componentId}
      onChange={handleChange}
      value={idValue && idValueExists ? idValue : ''}
    >
      <StudioSelect.Option value='' disabled />
      {options.map((option) => (
        <StudioSelect.Option key={option} value={option}>
          {option}
        </StudioSelect.Option>
      ))}
    </StudioSelect>
  );
};
