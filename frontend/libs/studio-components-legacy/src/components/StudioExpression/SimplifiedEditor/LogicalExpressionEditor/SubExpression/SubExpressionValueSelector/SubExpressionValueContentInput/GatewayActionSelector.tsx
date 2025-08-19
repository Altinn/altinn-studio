import React, { type ChangeEvent } from 'react';
import { StudioNativeSelect } from '../../../../../../StudioNativeSelect';
import type { Props } from './Props';
import { PredefinedGatewayAction } from '../../../../../enums/PredefinedGatewayAction';
import { useStudioExpressionContext } from '../../../../../StudioExpressionContext';
import type { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';

export const GatewayActionSelector = ({
  value,
  onChange,
}: Props<SimpleSubexpressionValueType.PredefinedGatewayAction>) => {
  const { texts } = useStudioExpressionContext();
  const options = Object.values(PredefinedGatewayAction);
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) =>
    onChange({ ...value, key: event.target.value as PredefinedGatewayAction });

  return (
    <StudioNativeSelect
      size='small'
      onChange={handleChange}
      label={texts.gatewayAction}
      defaultValue={value.key}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {texts.predefinedGatewayActions[option]}
        </option>
      ))}
    </StudioNativeSelect>
  );
};
