import type { Props } from './Props';
import type { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import React from 'react';
import { useStudioExpressionContext } from '../../../../../StudioExpressionContext';
import { StudioBooleanToggleGroup } from '../../../../../../StudioBooleanToggleGroup';

export const BooleanInput = ({
  value,
  onChange,
}: Props<SimpleSubexpressionValueType.Boolean>): React.ReactElement => {
  const { texts } = useStudioExpressionContext();

  const handleChange = (booleanValue: boolean): void => onChange({ ...value, value: booleanValue });

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
