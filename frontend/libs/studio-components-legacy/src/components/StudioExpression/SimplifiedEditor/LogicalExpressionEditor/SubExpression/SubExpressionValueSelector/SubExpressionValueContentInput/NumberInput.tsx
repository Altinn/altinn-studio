import type { Props } from './Props';
import type { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import React from 'react';
import { useStudioExpressionContext } from '../../../../../StudioExpressionContext';
import { StudioDecimalInput } from '../../../../../../StudioDecimalInput';

export const NumberInput = ({ value, onChange }: Props<SimpleSubexpressionValueType.Number>) => {
  const { texts } = useStudioExpressionContext();

  const handleChange = (number: number) => onChange({ ...value, value: number });

  return (
    <StudioDecimalInput
      label={texts.value}
      onChange={handleChange}
      validationErrorMessage={texts.numberValidationError}
      value={value.value}
    />
  );
};
