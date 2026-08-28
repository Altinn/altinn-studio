import type { PropertyDefinition } from '@app/layout-contract';

export type FormItemProperty = {
  path: readonly string[];
  definition: PropertyDefinition;
};
