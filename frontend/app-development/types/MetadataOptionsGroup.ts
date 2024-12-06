import type { MetadataOption } from './MetadataOption';

export interface MetadataOptionsGroup {
  readonly label: 'JSONSchema' | 'XSD';
  readonly options: readonly MetadataOption[];
}
