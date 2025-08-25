import type { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import type { ChangeEventHandler } from 'react';
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
}: SubexpressionValueTypeSelectorProps): React.ReactElement => {
  const { texts, types } = useStudioExpressionContext();

  const handleChange: ChangeEventHandler<HTMLSelectElement> = (event) =>
    onChange(event.target.value as SimpleSubexpressionValueType);

  return (
    <NativeSelect label={texts.valueType} onChange={handleChange} size='small' value={value}>
      {types.map((valueType) => (
        <option key={valueType} value={valueType}>
          {texts.valueTypes[valueType]}
        </option>
      ))}
    </NativeSelect>
  );
};
