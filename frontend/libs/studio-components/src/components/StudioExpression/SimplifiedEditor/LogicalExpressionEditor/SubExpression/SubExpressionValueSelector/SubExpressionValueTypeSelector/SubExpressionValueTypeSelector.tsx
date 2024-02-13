import { SimpleSubExpressionValueType } from '../../../../../enums/SimpleSubExpressionValueType';
import type { ChangeEvent } from 'react';
import React, { useContext } from 'react';
import { NativeSelect } from '@digdir/design-system-react';
import { StudioExpressionContext } from '../../../../../StudioExpressionContext';

export type SubExpressionValueTypeSelectorProps = {
  onChange: (value: SimpleSubExpressionValueType) => void;
  value: SimpleSubExpressionValueType;
};

export const SubExpressionValueTypeSelector = ({
  value,
  onChange,
}: SubExpressionValueTypeSelectorProps) => {
  const { texts } = useContext(StudioExpressionContext);

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) =>
    onChange(event.target.value as SimpleSubExpressionValueType);

  const options = Object.values(SimpleSubExpressionValueType);

  return (
    <NativeSelect label={texts.valueType} onChange={handleChange} size='small' value={value}>
      {options.map((valueType) => (
        <option key={valueType} value={valueType}>
          {texts.valueTypes[valueType]}
        </option>
      ))}
    </NativeSelect>
  );
};
