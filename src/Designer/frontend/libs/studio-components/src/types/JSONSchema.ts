import { type KeyValuePairs } from './KeyValuePairs';

export interface JsonSchema {
  properties?: KeyValuePairs<KeyValuePairs>;
  $defs?: KeyValuePairs<KeyValuePairs>;
  $schema?: string;
  $id?: string;

  [key: string]: unknown;
}
