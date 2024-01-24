import { ComponentType } from 'app-shared/types/ComponentType';
import { internalGroupComponentToExternal } from './internalGroupComponentToExternal';
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
      pageIndex: null,
      customProperty,
    };
    const result = internalGroupComponentToExternal(internalGroupComponent, children);
    expect(result).toEqual({
      id,
      children,
      type: ComponentType.Group,
      customProperty,
    });
  });
});
