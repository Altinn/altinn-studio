import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { validVersions } from './version';

export type AppFrontendVersion = (typeof validVersions)[number];

export type ComponentName = keyof typeof ComponentType;

export type PrefixedComponentName = `Comp${ComponentName}`;

export interface LayoutSchema {
  $schema: string;
  $id: string;
  $ref: string;
  definitions: KeyValuePairs<KeyValuePairs>;
}

export type CondensedComponentSchema =
  | {
      title?: never;
      anyOf?: never;
      allOf: KeyValuePairs[];
    }
  | {
      title: string;
      anyOf: KeyValuePairs[];
      allOf?: never;
    };

export interface ExpandedComponentSchema {
  $id: string;
  $schema: string;
  properties: KeyValuePairs<KeyValuePairs>;
  required: string[];
  title: string;
}
