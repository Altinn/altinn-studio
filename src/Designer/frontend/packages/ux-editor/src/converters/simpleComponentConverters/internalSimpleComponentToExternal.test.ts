import { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { FormComponent } from '../../types/FormComponent';
import { internalSimpleComponentToExternal } from './internalSimpleComponentToExternal';

// Test data:
const id = '1';
const customProperty = 'test';
const type: ComponentType = ComponentType.Input;

describe('internalGroupComponentToExternal', () => {
  it('Correctly converts an internal simple component', () => {
    const internalSimpleComponent: FormComponent = {
      id,
      type,
      dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
      customProperties: { customProperty },
    };
    const result = internalSimpleComponentToExternal(internalSimpleComponent);
    expect(result).toEqual({
      id,
      type,
      customProperty,
      dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
    });
  });
});
