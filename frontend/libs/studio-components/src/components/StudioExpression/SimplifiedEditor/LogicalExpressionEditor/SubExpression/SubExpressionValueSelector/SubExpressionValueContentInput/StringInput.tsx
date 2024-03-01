import type { Props } from './Props';
import type { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import type { ChangeEvent } from 'react';
import React from 'react';
import { useStudioExpressionContext } from '../../../../../StudioExpressionContext';
import { Textfield } from '@digdir/design-system-react';

export const StringInput = ({ value, onChange }: Props<SimpleSubexpressionValueType.String>) => {
  const { texts } = useStudioExpressionContext();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, value: event.target.value });

  return <Textfield size='small' value={value.value} onChange={handleChange} label={texts.value} />;
};
