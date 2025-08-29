import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export type FilterKeysOfType<ObjectType extends KeyValuePairs, ValueType> = {
  [K in keyof ObjectType]: ObjectType[K] extends ValueType ? K : never;
}[keyof ObjectType];
