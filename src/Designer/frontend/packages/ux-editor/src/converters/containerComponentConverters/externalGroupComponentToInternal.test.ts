import type { SerializedContainerComponent } from '../../types/SerializedComponent';
import { externalContainerComponentToInternal } from './externalContainerComponentToInternal';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';

// Test data:
const id = '1';
const children = ['childId'];
const customProperty = 'test';

describe('externalGroupComponentToInternal', () => {
  it('converts an external group component', () => {
    const externalComponent: SerializedContainerComponent = {
      id,
      type: ComponentType.Group,
      children,
      customProperty,
    };
    const result = externalContainerComponentToInternal(externalComponent);
    expect(result).toEqual({
      id,
      type: ComponentType.Group,
      customProperties: { customProperty },
    });
  });
});
