import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { internalContainerComponentToExternal } from './internalContainerComponentToExternal';
import type { FormContainer } from '../../types/FormContainer';

// Test data:
const id = '1';
const children = ['childId'];
const customProperty = 'test';

describe('internalGroupComponentToExternal', () => {
  it('Correctly converts an internal group component', () => {
    const internalGroupComponent: FormContainer = {
      id,
      itemType: 'CONTAINER',
      type: ComponentTypeV3.Group,
      pageIndex: null,
      customProperty,
    };
    const result = internalContainerComponentToExternal(internalGroupComponent, children);
    expect(result).toEqual({
      id,
      children,
      type: ComponentTypeV3.Group,
      customProperty,
    });
  });
});
