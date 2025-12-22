import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import { FormItem } from '../../../types/FormItem';
import { componentComparison } from './ConfigPropertiesUtils';

describe('ConfigStringPropertiesUtils', () => {
  const componentA = componentMocks.Input;
  const updatedComponentA = {
    ...componentMocks.Input,
    dataModelBindings: {
      ...componentMocks.Input.dataModelBindings,
      simpleBinding: { field: 'newField', dataType: 'string' },
    },
  };

  it('componentComparison should return true for identical components', () => {
    expect(
      componentComparison({ initialComponent: componentA, currentComponent: componentA }),
    ).toBe(true);
  });

  it('componentComparison should return false for different components', () => {
    expect(
      componentComparison({ initialComponent: componentA, currentComponent: updatedComponentA }),
    ).toBe(false);
  });
});
