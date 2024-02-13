import { SimpleSubExpressionValueType } from '../../../../../enums/SimpleSubExpressionValueType';
import type { SimpleSubExpressionValue } from '../../../../../types/SimpleSubExpressionValue';
import { InstanceContext } from '../../../../../enums/InstanceContext';

export const getDefaultValueOfType = (newType: SimpleSubExpressionValueType) =>
  defaultValueByType[newType];

const defaultValueByType: {
  [K in SimpleSubExpressionValueType]: SimpleSubExpressionValue<K>;
} = {
  [SimpleSubExpressionValueType.Component]: {
    type: SimpleSubExpressionValueType.Component,
    id: '',
  },
  [SimpleSubExpressionValueType.Datamodel]: {
    type: SimpleSubExpressionValueType.Datamodel,
    path: '',
  },
  [SimpleSubExpressionValueType.InstanceContext]: {
    type: SimpleSubExpressionValueType.InstanceContext,
    key: InstanceContext.AppId,
  },
  [SimpleSubExpressionValueType.String]: {
    type: SimpleSubExpressionValueType.String,
    value: '',
  },
  [SimpleSubExpressionValueType.Number]: {
    type: SimpleSubExpressionValueType.Number,
    value: 0,
  },
  [SimpleSubExpressionValueType.Boolean]: {
    type: SimpleSubExpressionValueType.Boolean,
    value: false,
  },
  [SimpleSubExpressionValueType.Null]: { type: SimpleSubExpressionValueType.Null },
};
