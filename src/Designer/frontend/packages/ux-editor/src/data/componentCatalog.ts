import { componentCatalog } from '@app/layout-contract';
import type {
  ComponentCatalog,
  ComponentDefinition,
  PropertyDefinition,
  PropertyValueDefinition,
} from '@app/layout-contract';
import type { FormItemProperty } from '../types/FormItemProperty';

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
    return Object.keys(definition.properties).length ? 'object' : undefined;
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

export function getBooleanExpressionProperties(componentType: string): FormItemProperty[] {
  const definition = getComponentDefinition(componentType);
  if (!definition) return [];

  return Object.entries(definition.properties).flatMap(([key, property]) =>
    findBooleanExpressionProperties(property, [key]),
  );
}

function findBooleanExpressionProperties(
  definition: PropertyDefinition,
  path: readonly string[],
): FormItemProperty[] {
  if (definition.type === 'boolean' && definition.expression) return [{ path, definition }];
  if (definition.type === 'object') {
    return Object.entries(definition.properties).flatMap(([key, property]) =>
      findBooleanExpressionProperties(property, [...path, key]),
    );
  }
  if (definition.type === 'union') {
    return uniqueProperties(
      definition.variants.flatMap((variant) =>
        variant.type === 'object'
          ? Object.entries(variant.properties).flatMap(([key, property]) =>
              findBooleanExpressionProperties(property, [...path, key]),
            )
          : [],
      ),
    );
  }
  if (definition.type === 'intersection') {
    return uniqueProperties(
      definition.parts.flatMap((part) =>
        part.type === 'object'
          ? Object.entries(part.properties).flatMap(([key, property]) =>
              findBooleanExpressionProperties(property, [...path, key]),
            )
          : [],
      ),
    );
  }
  return [];
}

function uniqueProperties(properties: FormItemProperty[]): FormItemProperty[] {
  return properties.filter(
    (property, index) =>
      properties.findIndex((candidate) => pathsAreEqual(candidate.path, property.path)) === index,
  );
}

function pathsAreEqual(first: readonly string[], second: readonly string[]): boolean {
  return (
    first.length === second.length && first.every((segment, index) => segment === second[index])
  );
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

export function getNestedPropertyDefinition(
  componentType: string,
  path: readonly string[],
): PropertyDefinition | undefined {
  let definition: PropertyValueDefinition | ComponentDefinition | undefined =
    getComponentDefinition(componentType);
  for (const segment of path) {
    definition = getChildDefinition(definition, segment);
    if (!definition) return undefined;
  }
  return definition as PropertyDefinition | undefined;
}

function getChildDefinition(
  definition: PropertyValueDefinition | ComponentDefinition | undefined,
  property: string,
): PropertyDefinition | undefined {
  if (!definition) return undefined;
  if ('kind' in definition) return definition.properties[property];
  if (definition.type === 'array') return getChildDefinition(definition.items, property);
  if (definition.type === 'object') return definition.properties[property];
  if (definition.type === 'union') {
    for (const variant of definition.variants) {
      const child = getChildDefinition(variant, property);
      if (child) return child;
    }
  }
  return undefined;
}

export function validateCatalogValue(
  definition: PropertyDefinition | undefined,
  value: unknown,
): string {
  if (!definition) return '';
  if (value === undefined || value === null || value === '') {
    return definition.required ? 'required' : '';
  }
  if (definition.type === 'string' && definition.pattern) {
    return new RegExp(definition.pattern).test(String(value)) ? '' : 'pattern';
  }
  if (
    (definition.type === 'number' || definition.type === 'integer') &&
    typeof value === 'number'
  ) {
    if (definition.type === 'integer' && !Number.isInteger(value)) return 'integer';
    if (definition.minimum !== undefined && value < definition.minimum) return 'minimum';
    if (definition.maximum !== undefined && value > definition.maximum) return 'maximum';
  }
  return '';
}
