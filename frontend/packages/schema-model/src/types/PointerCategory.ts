import type { Keyword } from './Keyword';
import type { CombinationKind } from './CombinationKind';

export type PointerCategory =
  | Keyword.Properties
  | Keyword.Definitions
  | Keyword.Items
  | `${Keyword.Items}/${Keyword.Properties}`
  | CombinationKind
  | `${Keyword.Items}/${CombinationKind}`;
