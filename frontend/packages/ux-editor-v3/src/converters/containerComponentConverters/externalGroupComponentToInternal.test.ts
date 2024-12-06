import type { ExternalContainerComponent } from '../../types/ExternalContainerComponent';
import { externalContainerComponentToInternal } from './externalContainerComponentToInternal';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';

// Test data:
const id = '1';
const children = ['childId'];
const customProperty = 'test';

describe('externalGroupComponentToInternal', () => {
  it.each([null, 0, 1, 2])(
    'Correctly converts an external group component with page index set to %s',
    (pageIndex) => {
      const externalComponent: ExternalContainerComponent = {
        id,
        type: ComponentTypeV3.Group,
        children,
        customProperty,
      };
      const result = externalContainerComponentToInternal(externalComponent, pageIndex);
      expect(result).toEqual({
        id,
        itemType: 'CONTAINER',
        type: ComponentTypeV3.Group,
        pageIndex,
        propertyPath: 'definitions/groupComponent',
        customProperty,
      });
    },
  );
});
