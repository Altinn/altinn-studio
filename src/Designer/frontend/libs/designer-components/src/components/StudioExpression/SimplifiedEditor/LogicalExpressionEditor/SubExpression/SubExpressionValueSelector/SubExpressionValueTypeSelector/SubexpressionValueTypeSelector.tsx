import type { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import type { ChangeEventHandler } from 'react';
import React from 'react';
import { StudioSelect } from '../../../../../../StudioSelect';
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
    <StudioSelect label={texts.valueType} onChange={handleChange} value={value}>
      {types.map((valueType) => (
        <option key={valueType} value={valueType}>
          {texts.valueTypes[valueType]}
        </option>
      ))}
    </StudioSelect>
  );
};
