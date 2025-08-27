import type { CodeListItem, CodeListItemValue } from 'libs/studio-components-legacy/src';

export type Option<T extends CodeListItemValue = CodeListItemValue> = CodeListItem<T>;
