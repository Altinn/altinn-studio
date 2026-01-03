import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import { componentComparison, getDisplayValue } from './ConfigPropertiesUtils';

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

describe('getDisplayValue', () => {
  const propertyKey = 'someStringProperty';
  const getComponentMock = (value: any) => ({
    ...componentMocks.Input,
    [propertyKey]: value,
  });

  type CasesProps = {
    description: string;
    value: any;
    expected: string | undefined;
  };

  const cases: CasesProps[] = [
    {
      description: 'should return the property value when it exists',
      value: 'Test Value',
      expected: 'Test Value',
    },
    {
      description: 'should return undefined when the property value is undefined',
      value: undefined,
      expected: undefined,
    },
    {
      description: 'should return a comma-separated string for array property values',
      value: ['Value1', 'Value2', 'Value3'],
      expected: 'Value1, Value2, Value3',
    },
    {
      description: 'should return comma-separated string for object property values',
      value: { key1: 'Value1', key2: 'Value2' },
      expected: 'key1: Value1, key2: Value2',
    },
  ];

  it.each(cases)('$description', ({ value, expected }) => {
    const component = getComponentMock(value);
    const displayValue = getDisplayValue({ component, propertyKey });
    expect(displayValue).toBe(expected);
  });
});
