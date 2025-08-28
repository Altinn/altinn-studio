import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export interface JsonSchema {
  properties?: KeyValuePairs<KeyValuePairs>;
  $defs?: KeyValuePairs<KeyValuePairs>;
  $schema?: string;
  $id?: string;
  [key: string]: any;
}
