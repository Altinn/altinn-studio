import {
  advancedItems,
  confOnScreenComponents,
  schemaComponents,
  textComponents,
} from './formItemConfig';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';

describe('formItemConfig', () => {
  const allAvailableLists = [
    schemaComponents,
    advancedItems,
    textComponents,
    confOnScreenComponents,
  ];
  const allAvailableComponents = allAvailableLists.flat();
  const excludedComponents = [
    ComponentType.Custom,
    ComponentType.Payment,
    ComponentType.Summary,
    ComponentType.AddToList,
    ComponentType.SimpleTable,
  ];

  /** Test that all non-beta components intended for ordinary layouts are available in a visible list. */
  it.each(
    Object.values(ComponentType).filter(
      (componentType) => !excludedComponents.includes(componentType),
    ),
  )('%s is available through one of the visible lists', (componentType) => {
    expect(allAvailableComponents.map(({ name }) => name)).toContain(componentType);
  });

  test('that payment component is not available in the visible lists', () => {
    expect(allAvailableComponents.map(({ name }) => name)).not.toContain(ComponentType.Payment);
  });
});
