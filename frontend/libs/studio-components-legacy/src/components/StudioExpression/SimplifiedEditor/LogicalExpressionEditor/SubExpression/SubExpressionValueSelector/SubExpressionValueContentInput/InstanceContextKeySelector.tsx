import type { Props } from './Props';
import type { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import type { ChangeEventHandler } from 'react';
import React from 'react';
import { useStudioExpressionContext } from '../../../../../StudioExpressionContext';
import { InstanceContext } from '../../../../../enums/InstanceContext';
import { NativeSelect } from '@digdir/designsystemet-react';

export const InstanceContextKeySelector = ({
  value,
  onChange,
}: Props<SimpleSubexpressionValueType.InstanceContext>): React.ReactElement => {
  const { texts } = useStudioExpressionContext();
  const options = Object.values(InstanceContext);
  const handleChange: ChangeEventHandler<HTMLSelectElement> = (event) =>
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
