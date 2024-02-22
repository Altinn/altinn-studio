import type { Props } from './Props';
import type { SimpleSubExpressionValueType } from '../../../../../enums/SimpleSubExpressionValueType';
import React, { useContext } from 'react';
import { StudioExpressionContext } from '../../../../../StudioExpressionContext';
import { StudioDecimalInput } from '../../../../../../StudioDecimalInput';

export const NumberInput = ({ value, onChange }: Props<SimpleSubExpressionValueType.Number>) => {
  const { texts } = useContext(StudioExpressionContext);

  const handleChange = (number: number) => onChange({ ...value, value: number });

  return (
    <StudioDecimalInput
      label={texts.value}
      onChange={handleChange}
      size='small'
      validationErrorMessage={texts.numberValidationError}
      value={value.value}
    />
  );
};
