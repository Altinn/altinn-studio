import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { validVersions } from './version';

export type AppFrontendVersion = (typeof validVersions)[number];

export type ComponentName = keyof typeof ComponentType;

export type PrefixedComponentName = `Comp${ComponentName}`;

export type LayoutSchema = {
  $schema: string;
  $id: string;
  $ref: string;
  definitions: KeyValuePairs<KeyValuePairs>;
};

export type AllOfDefinition = {
  allOf: KeyValuePairs[];
};

export type AnyOfDefinition = {
  title: string;
  anyOf: KeyValuePairs[];
};

export type CondensedComponentSchema = AllOfDefinition | AnyOfDefinition;

export type ExpandedComponentSchema = {
  $id: string;
  $schema: string;
  properties: KeyValuePairs<KeyValuePairs>;
  required: string[];
  title: string;
};
