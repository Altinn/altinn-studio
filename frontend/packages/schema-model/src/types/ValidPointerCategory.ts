import type { Keyword } from './Keyword';
import type { CombinationKind } from './CombinationKind';

export type ValidPointerCategory =
  | Keyword.Properties
  | Keyword.Definitions
  | Keyword.Items
  | `${Keyword.Items}/${Keyword.Properties}`
  | CombinationKind.AllOf
  | CombinationKind.AnyOf
  | CombinationKind.OneOf;
