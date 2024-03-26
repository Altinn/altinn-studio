import type { InstanceContext } from '../enums/InstanceContext';
import type { SimpleSubexpressionValueType } from '../enums/SimpleSubexpressionValueType';

export type SimpleSubexpressionValue<
  T extends SimpleSubexpressionValueType = SimpleSubexpressionValueType,
> = {
  [K in T]: { type: K } & ValueDetails<K>;
}[T];

type ValueDetails<T extends SimpleSubexpressionValueType> = {
  [SimpleSubexpressionValueType.Component]: { id: string };
  [SimpleSubexpressionValueType.Datamodel]: { path: string };
  [SimpleSubexpressionValueType.InstanceContext]: { key: InstanceContext };
  [SimpleSubexpressionValueType.String]: { value: string };
  [SimpleSubexpressionValueType.Number]: { value: number };
  [SimpleSubexpressionValueType.Boolean]: { value: boolean };
  [SimpleSubexpressionValueType.Null]: {};
}[T];
