import type { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { DataLookupFuncName } from '@studio/components';

export type MetadataValue = ExprValToActualOrExpr<ExprVal.String>;
export type BrokerMetadata = Record<string, MetadataValue>;

// Broker's limits for a file transfer's property list
export const MAX_METADATA_ENTRIES = 10;
const MAX_METADATA_KEY_LENGTH = 50;

export type MetadataDraft = {
  key: string;
  source: 'field' | 'text' | 'expression';
  field: string;
  text: string;
  // Kept as it is, since Studio only edits fields and fixed texts
  expression: MetadataValue;
};

export type MetadataKeyError = 'key_empty' | 'key_too_long' | 'key_taken';

export const emptyMetadataDraft: MetadataDraft = {
  key: '',
  source: 'field',
  field: '',
  text: '',
  expression: '',
};

export function toMetadataDraft(key: string, value: MetadataValue): MetadataDraft {
  if (typeof value === 'string') {
    return { ...emptyMetadataDraft, key, source: 'text', text: value };
  }
  const field = dataModelFieldOf(value);
  return field === null
    ? { ...emptyMetadataDraft, key, source: 'expression', expression: value }
    : { ...emptyMetadataDraft, key, source: 'field', field };
}

export function dataModelFieldOf(value: MetadataValue): string | null {
  return Array.isArray(value) &&
    value.length === 2 &&
    value[0] === DataLookupFuncName.DataModel &&
    typeof value[1] === 'string'
    ? value[1]
    : null;
}

export function metadataKeyError(key: string, otherKeys: string[]): MetadataKeyError | null {
  const trimmed = key.trim();
  if (!trimmed) return 'key_empty';
  if (trimmed.length > MAX_METADATA_KEY_LENGTH) return 'key_too_long';
  return otherKeys.includes(trimmed) ? 'key_taken' : null;
}

export function hasMetadataValue({ source, field, text }: MetadataDraft): boolean {
  if (source === 'field') return !!field;
  if (source === 'text') return !!text.trim();
  return true;
}

// Puts the entry at the index, or last when the index is past the end, keeping the order of the others
export function withMetadataEntry(
  metadata: BrokerMetadata | undefined,
  index: number,
  draft: MetadataDraft,
): BrokerMetadata {
  const entries = Object.entries(metadata ?? {});
  entries.splice(index, 1, [draft.key.trim(), toValue(draft)]);
  return Object.fromEntries(entries);
}

export function withoutMetadataEntry(
  metadata: BrokerMetadata | undefined,
  index: number,
): BrokerMetadata | undefined {
  const entries = Object.entries(metadata ?? {}).filter((_, entryIndex) => entryIndex !== index);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function toValue({ source, field, text, expression }: MetadataDraft): MetadataValue {
  if (source === 'field') return [DataLookupFuncName.DataModel, field];
  return source === 'text' ? text : expression;
}
