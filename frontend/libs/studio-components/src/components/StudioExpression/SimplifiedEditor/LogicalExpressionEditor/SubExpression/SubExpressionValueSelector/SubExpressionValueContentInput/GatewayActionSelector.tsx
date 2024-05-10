import type { Props } from './Props';
import type { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import type { ChangeEvent } from 'react';
import React from 'react';
import { useStudioExpressionContext } from '../../../../../StudioExpressionContext';
import { NativeSelect } from '@digdir/design-system-react';
import { GatewayActionContext } from '../../../../../enums/GatewayActionContext';

export const GatewayActionSelector = ({
  value,
  onChange,
}: Props<SimpleSubexpressionValueType.GatewayActionContext>) => {
  const { texts } = useStudioExpressionContext();
  const options = Object.values(GatewayActionContext);
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) =>
    onChange({ ...value, key: event.target.value as GatewayActionContext });

  return (
    <NativeSelect
      size='small'
      onChange={handleChange}
      label={texts.gatewayActionKey}
      defaultValue={value.key}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {texts.gatewayActionContext[option]}
        </option>
      ))}
    </NativeSelect>
  );
};
