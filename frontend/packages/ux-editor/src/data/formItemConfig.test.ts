import {
  advancedItems,
  confOnScreenComponents,
  schemaComponents,
  textComponents,
} from './formItemConfig';
import { ComponentType } from 'app-shared/types/ComponentType';

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
    ComponentType.Subform,
    ComponentType.Summary2,
  ];

  /**  Test that all components, except Custom, Payment, Subform and Summary2 (since behind featureFlag), are available in one of the visible lists */
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

  test('that subform component is not available in the visible lists', () => {
    expect(allAvailableComponents.map(({ name }) => name)).not.toContain(ComponentType.Subform);
  });

  test('that Summary2 component is not available in the visible lists', () => {
    expect(allAvailableComponents.map(({ name }) => name)).not.toContain(ComponentType.Summary2);
  });
});
