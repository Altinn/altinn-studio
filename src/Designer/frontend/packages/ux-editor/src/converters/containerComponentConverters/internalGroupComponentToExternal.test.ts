import { ComponentType } from 'app-shared/types/ComponentType';
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
      type: ComponentType.Group,
      pageIndex: null,
      customProperty,
    } as FormContainer<ComponentType.Group>;
    const result = internalContainerComponentToExternal(internalGroupComponent, children);
    expect(result).toEqual({
      id,
      children,
      type: ComponentType.Group,
      customProperty,
    });
  });
});
