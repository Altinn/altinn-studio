import type { CodeListItem, CodeListItemValue } from '@designer/components';

export type Option<T extends CodeListItemValue = CodeListItemValue> = CodeListItem<T>;
