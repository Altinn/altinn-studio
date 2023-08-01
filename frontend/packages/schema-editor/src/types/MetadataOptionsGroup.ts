import { MetadataOption } from '@altinn/schema-editor/types/MetadataOption';

export interface MetadataOptionsGroup {
  readonly label: 'JSONSchema' | 'XSD';
  readonly options: readonly MetadataOption[];
}
