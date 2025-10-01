import { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import type { SimpleSubexpressionValue } from '../../../../../types/SimpleSubexpressionValue';
import { InstanceContext } from '../../../../../enums/InstanceContext';
import { PredefinedGatewayAction } from '../../../../../enums/PredefinedGatewayAction';

export const getDefaultValueOfType = (
  newType: SimpleSubexpressionValueType,
): SimpleSubexpressionValue => defaultValueByType[newType];

const defaultValueByType: {
  [K in SimpleSubexpressionValueType]: SimpleSubexpressionValue<K>;
} = {
  [SimpleSubexpressionValueType.Component]: {
    type: SimpleSubexpressionValueType.Component,
    id: '',
  },
  [SimpleSubexpressionValueType.DataModel]: {
    type: SimpleSubexpressionValueType.DataModel,
    path: '',
  },
  [SimpleSubexpressionValueType.CurrentGatewayAction]: {
    type: SimpleSubexpressionValueType.CurrentGatewayAction,
  },
  [SimpleSubexpressionValueType.PredefinedGatewayAction]: {
    type: SimpleSubexpressionValueType.PredefinedGatewayAction,
    key: PredefinedGatewayAction.Confirm,
  },
  [SimpleSubexpressionValueType.InstanceContext]: {
    type: SimpleSubexpressionValueType.InstanceContext,
    key: InstanceContext.AppId,
  },
  [SimpleSubexpressionValueType.String]: {
    type: SimpleSubexpressionValueType.String,
    value: '',
  },
  [SimpleSubexpressionValueType.Number]: {
    type: SimpleSubexpressionValueType.Number,
    value: 0,
  },
  [SimpleSubexpressionValueType.Boolean]: {
    type: SimpleSubexpressionValueType.Boolean,
    value: false,
  },
  [SimpleSubexpressionValueType.Null]: { type: SimpleSubexpressionValueType.Null },
};
