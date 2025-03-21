import type { CodeListItem, CodeListItemValue } from '@studio/components-legacy';

export type Option<T extends CodeListItemValue = CodeListItemValue> = CodeListItem<T>;
