import type { Props } from './Props';
import type { SimpleSubExpressionValueType } from '../../../../../enums/SimpleSubExpressionValueType';
import React, { useContext } from 'react';
import { StudioExpressionContext } from '../../../../../StudioExpressionContext';
import { StudioBooleanToggleGroup } from '../../../../../../StudioBooleanToggleGroup';

export const BooleanInput = ({ value, onChange }: Props<SimpleSubExpressionValueType.Boolean>) => {
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
