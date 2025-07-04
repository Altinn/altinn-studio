import type { Keyword } from './Keyword';
import type { CombinationKind } from './CombinationKind';
import type { Items } from '@altinn/schema-model/types/Items';

export type PointerCategory =
  | Keyword.Properties
  | Keyword.Definitions
  | Keyword.Items
  | Items
  | `${Keyword.Items}/${Keyword.Properties}`
  | CombinationKind
  | `${Keyword.Items}/${CombinationKind}`;
