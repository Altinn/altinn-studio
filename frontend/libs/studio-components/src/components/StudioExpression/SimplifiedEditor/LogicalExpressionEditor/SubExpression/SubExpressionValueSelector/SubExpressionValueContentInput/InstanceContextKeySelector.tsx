import type { Props } from './Props';
import type { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import type { ChangeEvent } from 'react';
import React, { useContext } from 'react';
import { StudioExpressionContext } from '../../../../../StudioExpressionContext';
import { InstanceContext } from '../../../../../enums/InstanceContext';
import { NativeSelect } from '@digdir/design-system-react';

export const InstanceContextKeySelector = ({
  value,
  onChange,
}: Props<SimpleSubexpressionValueType.InstanceContext>) => {
  const { texts } = useContext(StudioExpressionContext);
  const options = Object.values(InstanceContext);
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) =>
    onChange({ ...value, key: event.target.value as InstanceContext });
  return (
    <NativeSelect size='small' onChange={handleChange} label={texts.instanceContextKey}>
      {options.map((option) => (
        <option key={option} value={option}>
          {texts.instanceContext[option]}
        </option>
      ))}
    </NativeSelect>
  );
};
