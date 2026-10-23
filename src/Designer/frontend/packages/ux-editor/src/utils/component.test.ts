import { describe, expect, it } from 'vitest';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import { ComponentPreset } from '@altinn/ux-editor/types/ComponentPreset';
import { containerComponentTypes, isContainerComponentType } from '../data/containerComponentTypes';
import { componentPresetConfigs } from '../data/formItemConfig';
import type { ContainerComponentType } from '../types/ContainerComponent';
import type { FormComponent } from '../types/FormComponent';
import { componentMocks } from '../testing/componentMocks';
import {
  generateFormItem,
  validateNumberOfAttachments,
  isComponentDeprecated,
  setComponentProperty,
} from './component';

describe('generateFormItem', () => {
  it.each(
    Object.values(ComponentType).filter(
      (componentType) => !isContainerComponentType(componentType),
    ),
  )('generates component %s with the given ID', (componentType) => {
    expect(generateFormItem(componentType, 'testId')).toEqual(
      expect.objectContaining({ id: 'testId', type: componentType }),
    );
  });

  it('maps custom component types to their component reference', () => {
    expect(componentPresetConfigs[ComponentPreset.CloseSubformButton].componentRef).toBe(
      ComponentType.CustomButton,
    );
    expect(generateFormItem(ComponentPreset.CloseSubformButton, 'testId')).toEqual(
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
    expect(setComponentProperty(component, 'maxLength', 10)).toEqual({
      ...component,
      maxLength: 10,
    });
  });

  it('removes an optional property whose value becomes undefined', () => {
    expect(setComponentProperty(component, 'maxLength', undefined)).toEqual(component);
  });
});

describe('isComponentDeprecated', () => {
  it('reads deprecation status from the component catalogue', () => {
    expect(isComponentDeprecated(ComponentType.Summary)).toBe(true);
    expect(isComponentDeprecated(ComponentType.PrintButton)).toBe(true);
    expect(isComponentDeprecated(ComponentType.Input)).toBe(false);
  });
});

describe('validateNumberOfAttachments', () => {
  it.each([
    {
      propertyKey: 'minNumberOfAttachments',
      value: 2,
      minNumberOfAttachments: 1,
      maxNumberOfAttachments: 1,
      expected: 'minNumberOfAttachments_above_max',
    },
    {
      propertyKey: 'minNumberOfAttachments',
      value: 1,
      minNumberOfAttachments: 0,
      maxNumberOfAttachments: 0,
      expected: 'minNumberOfAttachments_above_max',
    },
    {
      propertyKey: 'minNumberOfAttachments',
      value: 1,
      minNumberOfAttachments: 0,
      maxNumberOfAttachments: 1,
      expected: '',
    },
    {
      propertyKey: 'maxNumberOfAttachments',
      value: 1,
      minNumberOfAttachments: 2,
      maxNumberOfAttachments: 3,
      expected: 'maxNumberOfAttachments_below_min',
    },
    {
      propertyKey: 'maxNumberOfAttachments',
      value: 2,
      minNumberOfAttachments: 2,
      maxNumberOfAttachments: 3,
      expected: '',
    },
    {
      propertyKey: 'minNumberOfAttachments',
      value: 5,
      minNumberOfAttachments: 1,
      maxNumberOfAttachments: undefined,
      expected: '',
    },
    {
      propertyKey: 'maxNumberOfAttachments',
      value: undefined,
      minNumberOfAttachments: 2,
      maxNumberOfAttachments: 3,
      expected: '',
    },
    {
      propertyKey: 'maxFileSizeInMB',
      value: 5,
      minNumberOfAttachments: 2,
      maxNumberOfAttachments: 1,
      expected: '',
    },
  ])(
    'returns "$expected" for $propertyKey $value when the minimum is $minNumberOfAttachments and the maximum is $maxNumberOfAttachments',
    ({ propertyKey, value, minNumberOfAttachments, maxNumberOfAttachments, expected }) => {
      const component = {
        ...componentMocks[ComponentType.FileUpload],
        minNumberOfAttachments,
        maxNumberOfAttachments,
      };
      expect(validateNumberOfAttachments(component, propertyKey, value)).toBe(expected);
    },
  );

  it('accepts any minimum when the maximum is an expression', () => {
    const component = {
      ...componentMocks[ComponentType.FileUpload],
      maxNumberOfAttachments: ['if', true, 3, 1],
    } satisfies FormComponent<ComponentType.FileUpload>;
    expect(validateNumberOfAttachments(component, 'minNumberOfAttachments', 5)).toBe('');
  });
});
