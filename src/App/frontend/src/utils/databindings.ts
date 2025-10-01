import type { IDataModelReference } from 'src/layout/common.generated';

export const GLOBAL_INDEX_KEY_INDICATOR_REGEX = /\[{\d+}]/g;

export function getKeyWithoutIndex(keyWithIndex: string): string {
  if (keyWithIndex?.indexOf('[') === -1) {
    return keyWithIndex;
  }

  return getKeyWithoutIndex(
    keyWithIndex.substring(0, keyWithIndex.indexOf('[')) + keyWithIndex.substring(keyWithIndex.indexOf(']') + 1),
  );
}

export function getKeyWithoutIndexIndicators(keyWithIndexIndicators: string): string {
  return keyWithIndexIndicators.replaceAll(GLOBAL_INDEX_KEY_INDICATOR_REGEX, '');
}

/**
 * Returns key indexes:
 *
 * MyForm.Group[0].SubGroup[1]
 *              ^           ^
 *
 * as an array => [0, 1]
 */
export function getKeyIndex(keyWithIndex: string): number[] {
  const match = keyWithIndex.match(/\[\d+]/g) || [];
  return match.map((n) => parseInt(n.replace('[', '').replace(']', ''), 10));
}

export function isDataModelReference(binding: unknown): binding is IDataModelReference {
  return (
    typeof binding === 'object' &&
    binding != null &&
    !Array.isArray(binding) &&
    'field' in binding &&
    typeof binding.field === 'string' &&
    'dataType' in binding &&
    typeof binding.dataType === 'string'
  );
}
