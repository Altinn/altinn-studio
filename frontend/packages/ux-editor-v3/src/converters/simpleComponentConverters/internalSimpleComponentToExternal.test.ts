import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormComponent } from '../../types/FormComponent';
import { formItemConfigs } from '../../data/formItemConfig';
import { internalSimpleComponentToExternal } from './internalSimpleComponentToExternal';

// Test data:
const id = '1';
const customProperty = 'test';
const type: ComponentType = ComponentType.Input;
const propertyPath = formItemConfigs[type].defaultProperties.propertyPath;

describe('internalGroupComponentToExternal', () => {
  it('Correctly converts an internal simple component', () => {
    const internalSimpleComponent: FormComponent = {
      id,
      itemType: 'COMPONENT',
      pageIndex: null,
      propertyPath,
      type,
      customProperty,
    };
    const result = internalSimpleComponentToExternal(internalSimpleComponent);
    expect(result).toEqual({
      id,
      type,
      customProperty,
    });
  });
});
