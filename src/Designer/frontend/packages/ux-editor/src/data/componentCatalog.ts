import { componentCatalog } from '@app/layout-contract';
import type {
  ComponentCatalog,
  ComponentDefinition,
  PropertyDefinition,
  PropertyValueDefinition,
} from '@app/layout-contract';

const catalog: ComponentCatalog = componentCatalog;

export function getComponentDefinition(componentType: string): ComponentDefinition | undefined {
  return catalog[componentType];
}

export type EditablePropertyType = 'boolean' | 'number' | 'integer' | 'string' | 'array' | 'object';

function constantType(value: string | number | boolean | null): EditablePropertyType | undefined {
  if (value === null) return undefined;
  if (typeof value === 'string') return 'string';
  if (typeof value === 'boolean') return 'boolean';
  return 'number';
}

export function getEditablePropertyType(
  definition: PropertyValueDefinition,
): EditablePropertyType | undefined {
  if (
    definition.type === 'boolean' ||
    definition.type === 'number' ||
    definition.type === 'integer' ||
    definition.type === 'string'
  ) {
    return definition.type;
  }
  if (definition.type === 'array') {
    return getAllowedValues(definition.items)?.length ? 'array' : undefined;
  }
  if (definition.type === 'object') {
    return definition.additionalProperties === false && Object.keys(definition.properties).length
      ? 'object'
      : undefined;
  }
  if (definition.type === 'union') {
    const types = new Set(
      definition.variants.map((variant) =>
        variant.type === 'constant'
          ? constantType(variant.value)
          : getEditablePropertyType(variant),
      ),
    );
    return types.size === 1 ? [...types][0] : undefined;
  }
  return undefined;
}

export function getAllowedValues(
  definition: PropertyValueDefinition,
): readonly (string | number | boolean)[] | undefined {
  if ('allowedValues' in definition && definition.allowedValues) return definition.allowedValues;
  if (
    definition.type === 'union' &&
    definition.variants.every((variant) => variant.type === 'constant')
  ) {
    return definition.variants
      .map((variant) => variant.value)
      .filter((value): value is string | number | boolean => value !== null);
  }
  return undefined;
}

export function getPropertyChoices(
  definition: PropertyDefinition,
): readonly (string | number | boolean)[] | undefined {
  return (
    getAllowedValues(definition) ??
    definition.examples?.filter(
      (value): value is string | number | boolean =>
        typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean',
    )
  );
}

export function getStringChoices(definition: PropertyDefinition): string[] | undefined {
  return getPropertyChoices(definition)?.filter(
    (value): value is string => typeof value === 'string',
  );
}

export function getNumberChoices(definition: PropertyDefinition): number[] | undefined {
  return getPropertyChoices(definition)?.filter(
    (value): value is number => typeof value === 'number',
  );
}

export function getBooleanDefault(definition: PropertyDefinition): boolean | undefined {
  return typeof definition.default === 'boolean' ? definition.default : undefined;
}

export function getArrayStringChoices(definition: PropertyDefinition): string[] {
  if (definition.type !== 'array') return [];
  return (
    getAllowedValues(definition.items)?.filter(
      (value): value is string => typeof value === 'string',
    ) ?? []
  );
}
