import { ComponentType, CustomComponentType } from 'app-shared/types/ComponentType';
import { containerComponentTypes, isContainerComponentType } from '../data/containerComponentTypes';
import { formItemConfigs } from '../data/formItemConfig';
import type { ContainerComponentType } from '../types/ContainerComponent';
import type { FormComponent } from '../types/FormComponent';
import { generateFormItem, isComponentDeprecated, setComponentProperty } from './component';

describe('generateFormItem', () => {
  it.each(
    Object.values(ComponentType).filter(
      (componentType) =>
        componentType !== ComponentType.OrganisationLookup &&
        componentType !== ComponentType.Header &&
        !isContainerComponentType(componentType),
    ),
  )('generates component %s with the given ID', (componentType) => {
    expect(generateFormItem(componentType, 'testId')).toEqual(
      expect.objectContaining({ id: 'testId', type: componentType }),
    );
  });

  it('maps custom component types to their component reference', () => {
    expect(formItemConfigs[CustomComponentType.CloseSubformButton].componentRef).toBe(
      ComponentType.CustomButton,
    );
    expect(generateFormItem(CustomComponentType.CloseSubformButton, 'testId')).toEqual(
      expect.objectContaining({
        id: 'testId',
        type: ComponentType.CustomButton,
      }),
    );
  });

  it.each(containerComponentTypes)(
    'generates container %s with the given ID',
    (componentType: ContainerComponentType) => {
      expect(generateFormItem(componentType, 'testId')).toEqual(
        expect.objectContaining({ id: 'testId', type: componentType }),
      );
    },
  );
});

describe('setComponentProperty', () => {
  const component: FormComponent = {
    id: 'test',
    type: ComponentType.Input,
    dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
  };

  it('sets a property', () => {
    expect(setComponentProperty(component, 'testProperty', 'testValue')).toEqual({
      ...component,
      testProperty: 'testValue',
    });
  });

  it('removes an optional property whose value becomes undefined', () => {
    expect(setComponentProperty(component, 'testProperty', undefined)).toEqual(component);
  });
});

describe('isComponentDeprecated', () => {
  it('reads deprecation status from the component catalogue', () => {
    expect(isComponentDeprecated(ComponentType.Summary)).toBe(true);
    expect(isComponentDeprecated(ComponentType.PrintButton)).toBe(true);
    expect(isComponentDeprecated(ComponentType.Input)).toBe(false);
  });
});
