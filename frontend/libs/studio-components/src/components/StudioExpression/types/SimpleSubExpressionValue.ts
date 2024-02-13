import type { InstanceContext } from '../enums/InstanceContext';
import type { SimpleSubExpressionValueType } from '../enums/SimpleSubExpressionValueType';

export type SimpleSubExpressionValue<
  T extends SimpleSubExpressionValueType = SimpleSubExpressionValueType,
> = {
  [K in T]: { type: K } & ValueDetails<K>;
}[T];

type ValueDetails<T extends SimpleSubExpressionValueType> = {
  [SimpleSubExpressionValueType.Component]: { id: string };
  [SimpleSubExpressionValueType.Datamodel]: { path: string };
  [SimpleSubExpressionValueType.InstanceContext]: { key: InstanceContext };
  [SimpleSubExpressionValueType.String]: { value: string };
  [SimpleSubExpressionValueType.Number]: { value: number };
  [SimpleSubExpressionValueType.Boolean]: { value: boolean };
  [SimpleSubExpressionValueType.Null]: {};
}[T];
