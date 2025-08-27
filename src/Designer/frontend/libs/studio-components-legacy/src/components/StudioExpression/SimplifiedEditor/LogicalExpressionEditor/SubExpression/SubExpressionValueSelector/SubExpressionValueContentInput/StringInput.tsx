import type { Props } from './Props';
import type { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import type { ChangeEventHandler } from 'react';
import React from 'react';
import { useStudioExpressionContext } from '../../../../../StudioExpressionContext';
import { StudioTextfield } from '../../../../../../../index';

export const StringInput = ({
  value,
  onChange,
}: Props<SimpleSubexpressionValueType.String>): React.ReactElement => {
  const { texts } = useStudioExpressionContext();

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) =>
    onChange({ ...value, value: event.target.value });

  return <StudioTextfield value={value.value} onChange={handleChange} label={texts.value} />;
};
