import { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import type { ChangeEvent } from 'react';
import React from 'react';
import { NativeSelect } from '@digdir/designsystemet-react';
import { useStudioExpressionContext } from '../../../../../StudioExpressionContext';

export type SubexpressionValueTypeSelectorProps = {
  onChange: (value: SimpleSubexpressionValueType) => void;
  value: SimpleSubexpressionValueType;
};

export const SubexpressionValueTypeSelector = ({
  value,
  onChange,
}: SubexpressionValueTypeSelectorProps) => {
  const { texts, expressionOptions } = useStudioExpressionContext();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) =>
    onChange(event.target.value as SimpleSubexpressionValueType);

  const options: string[] = expressionOptions || Object.values(SimpleSubexpressionValueType);

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
