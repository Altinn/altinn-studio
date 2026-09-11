import { getComponentDefinition } from '../data/componentCatalog';

const alwaysKnownProperties = new Set(['id', 'type', 'children']);

export type ComponentProperties = {
  known: Record<string, unknown>;
  custom: Record<string, unknown>;
};

export function separateComponentProperties(
  component: Record<string, unknown>,
): ComponentProperties {
  const definition = getComponentDefinition(String(component.type));
  const knownPropertyNames = new Set([
    ...alwaysKnownProperties,
    ...Object.keys(definition?.properties ?? {}),
  ]);
  const properties: ComponentProperties = { known: {}, custom: {} };

  for (const [key, value] of Object.entries(component)) {
    const target = knownPropertyNames.has(key) ? properties.known : properties.custom;
    target[key] = value;
  }

  return properties;
}

export function mergeComponentProperties<T extends object>(
  component: T,
  customProperties: Record<string, unknown> | undefined,
): T {
  return { ...customProperties, ...component };
}
