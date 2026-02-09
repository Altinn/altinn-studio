import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import { componentComparison, propHasValues } from './ConfigPropertiesUtils';

describe('ConfigPropertiesUtils', () => {
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

describe('propHasValues', () => {
  it('should return false for null, undefined and empty props', () => {
    expect(propHasValues(null)).toBe(false);
    expect(propHasValues(undefined)).toBe(false);
    expect(propHasValues([])).toBe(false);
    expect(propHasValues('')).toBe(false);
    expect(propHasValues('   ')).toBe(false);
    expect(propHasValues({})).toBe(false);
  });

  it('should return true for non-empty props', () => {
    expect(propHasValues(['value1'])).toBe(true);
    expect(propHasValues('test')).toBe(true);
    expect(propHasValues(true)).toBe(true);
    expect(propHasValues({ key: 'value' })).toBe(true);
  });

  it('should return true if a boolean prop is provided', () => {
    expect(propHasValues(true)).toBe(true);
    expect(propHasValues(false)).toBe(true);
  });
});
