import type { CodeListItem } from '@studio/components';

export type Option<T extends string | boolean | number = string | boolean | number> =
  CodeListItem<T>;
