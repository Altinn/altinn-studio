import type { CodeListItem, CodeListItemValue } from '@studio/components';

export type Option<T extends CodeListItemValue = CodeListItemValue> = CodeListItem<T>;
