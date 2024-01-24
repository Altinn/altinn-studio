import type { ExternalGroupComponent } from '../../types/ExternalGroupComponent';
import { externalGroupComponentToInternal } from './externalGroupComponentToInternal';
import { ComponentType } from 'app-shared/types/ComponentType';

// Test data:
const id = '1';
const children = ['childId'];
const customProperty = 'test';

describe('externalGroupComponentToInternal', () => {
  it.each([null, 0, 1, 2])(
    'Correctly converts an external group component with page index set to %s',
    (pageIndex) => {
      const externalComponent: ExternalGroupComponent = {
        id,
        type: ComponentType.Group,
        children,
        customProperty,
      };
      const result = externalGroupComponentToInternal(externalComponent, pageIndex);
      expect(result).toEqual({
        id,
        itemType: 'CONTAINER',
        pageIndex,
        propertyPath: 'definitions/groupComponent',
        customProperty,
      });
    },
  );
});
