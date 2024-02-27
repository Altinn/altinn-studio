import type { Props } from './Props';
import type { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import React, { useContext } from 'react';
import { StudioExpressionContext } from '../../../../../StudioExpressionContext';
import { StudioBooleanToggleGroup } from '../../../../../../StudioBooleanToggleGroup';

export const BooleanInput = ({ value, onChange }: Props<SimpleSubexpressionValueType.Boolean>) => {
  const { texts } = useContext(StudioExpressionContext);

  const handleChange = (booleanValue: boolean) => onChange({ ...value, value: booleanValue });

  return (
    <StudioBooleanToggleGroup
      falseLabel={texts.false}
      onChange={handleChange}
      size='small'
      trueLabel={texts.true}
      value={value.value}
    />
  );
};
