import { describe, expect, it, test } from 'vitest';
import {
  advancedItems,
  allComponents,
  confOnScreenComponents,
  defaultComponents,
  formItemConfigs,
  schemaComponents,
  textComponents,
} from './formItemConfig';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import { getComponentDefinition } from './componentCatalog';

describe('formItemConfig', () => {
  const allAvailableLists = [
    schemaComponents,
    advancedItems,
    textComponents,
    confOnScreenComponents,
  ];
  const allAvailableComponents = allAvailableLists.flat();
  const excludedComponents = [ComponentType.Custom, ComponentType.Payment, ComponentType.Summary];
  const isBeta = (componentType: ComponentType): boolean =>
    getComponentDefinition(componentType)?.metadata.lifecycle?.status === 'beta';

  /** Test that all non-beta components intended for ordinary layouts are available in a visible list. */
  it.each(
    Object.values(ComponentType).filter(
      (componentType) => !excludedComponents.includes(componentType) && !isBeta(componentType),
    ),
  )('%s is available through one of the visible lists', (componentType) => {
    expect(allAvailableComponents.map(({ name }) => name)).toContain(componentType);
  });

  test('that payment component is not available in the visible lists', () => {
    expect(allAvailableComponents.map(({ name }) => name)).not.toContain(ComponentType.Payment);
  });

  it('should not include BrokerFileTransfer when feature flag is not enabled', () => {
    expect(allAvailableComponents.map(({ name }) => name)).not.toContain(
      ComponentType.BrokerFileTransfer,
    );
  });

  // The add-component panel lists these by type, so a missing config would fall back to a generic one.
  it.each([...new Set([...Object.values(allComponents).flat(), ...defaultComponents])])(
    '%s in the add-component panel has a config',
    (componentType) => {
      expect(formItemConfigs).toHaveProperty(componentType);
    },
  );
});
