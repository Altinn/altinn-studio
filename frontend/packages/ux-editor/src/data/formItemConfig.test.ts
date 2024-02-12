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

  it.each(Object.values(ComponentType))(
    '%s is available through one of the visible lists',
    (componentType) => {
      expect(allAvailableComponents.map(({ name }) => name)).toContain(componentType);
    },
  );
});
