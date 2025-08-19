import type { Props } from './Props';
import type { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import type { ChangeEvent } from 'react';
import React from 'react';
import { useStudioExpressionContext } from '../../../../../StudioExpressionContext';
import { StudioTextfield } from '@studio/components-legacy';

export const StringInput = ({
  value,
  onChange,
}: Props<SimpleSubexpressionValueType.String>): React.ReactElement => {
  const { texts } = useStudioExpressionContext();

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void =>
    onChange({ ...value, value: event.target.value });

  return <StudioTextfield value={value.value} onChange={handleChange} label={texts.value} />;
};
