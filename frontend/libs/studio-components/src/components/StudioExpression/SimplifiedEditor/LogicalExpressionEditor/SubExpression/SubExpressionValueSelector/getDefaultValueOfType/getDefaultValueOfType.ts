import { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import type { SimpleSubexpressionValue } from '../../../../../types/SimpleSubexpressionValue';
import { InstanceContext } from '../../../../../enums/InstanceContext';

export const getDefaultValueOfType = (newType: SimpleSubexpressionValueType) =>
  defaultValueByType[newType];

const defaultValueByType: {
  [K in SimpleSubexpressionValueType]: SimpleSubexpressionValue<K>;
} = {
  [SimpleSubexpressionValueType.Component]: {
    type: SimpleSubexpressionValueType.Component,
    id: '',
  },
  [SimpleSubexpressionValueType.Datamodel]: {
    type: SimpleSubexpressionValueType.Datamodel,
    path: '',
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
