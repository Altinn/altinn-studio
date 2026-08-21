import { ComponentType } from 'app-shared/types/ComponentType';
import type { SerializedSimpleComponent } from '../../types/SerializedComponent';
import { externalSimpleComponentToInternal } from './externalSimpleComponentToInternal';

// Test data:
const id = '1';
const customProperty = 'test';
const type: ComponentType = ComponentType.Input;

describe('externalSimpleComponentToInternal', () => {
  it('converts an external simple component', () => {
    const externalComponent: SerializedSimpleComponent = {
      id,
      type,
      customProperty,
      dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
    };
    const result = externalSimpleComponentToInternal(externalComponent);
    expect(result).toEqual({
      id,
      type,
      customProperty,
      dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
    });
  });

  it('should convert unknown components', () => {
    const externalComponent = {
      id: '2',
      type: 'UnknownComponent',
      customProperty: null,
    } as unknown as SerializedSimpleComponent;

    const result = externalSimpleComponentToInternal(externalComponent);
    expect(result).toEqual({
      customProperty: null,
      id: '2',
      type: 'UnknownComponent',
    });
  });
});
