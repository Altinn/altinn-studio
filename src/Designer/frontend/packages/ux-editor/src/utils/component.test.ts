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
  getNumberOfAttachmentsBounds,
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

describe('getNumberOfAttachmentsBounds', () => {
  it.each([
    {
      propertyKey: 'minNumberOfAttachments',
      numberOfAttachments: { minNumberOfAttachments: 0, maxNumberOfAttachments: 3 },
      expected: { maximum: 3 },
    },
    {
      propertyKey: 'maxNumberOfAttachments',
      numberOfAttachments: { minNumberOfAttachments: 2, maxNumberOfAttachments: 3 },
      expected: { minimum: 2 },
    },
    {
      propertyKey: 'minNumberOfAttachments',
      numberOfAttachments: { maxNumberOfAttachments: undefined },
      expected: {},
    },
    {
      propertyKey: 'maxNumberOfAttachments',
      numberOfAttachments: { minNumberOfAttachments: undefined },
      expected: {},
    },
    {
      propertyKey: 'maxFileSizeInMB',
      numberOfAttachments: { minNumberOfAttachments: 2, maxNumberOfAttachments: 3 },
      expected: {},
    },
  ])(
    'returns $expected for $propertyKey when the attachment counts are $numberOfAttachments',
    ({ propertyKey, numberOfAttachments, expected }) => {
      const component = { ...componentMocks[ComponentType.FileUpload], ...numberOfAttachments };
      expect(getNumberOfAttachmentsBounds(component, propertyKey)).toEqual(expected);
    },
  );

  it('returns no bounds when the other attachment count is an expression', () => {
    const component = {
      ...componentMocks[ComponentType.FileUpload],
      maxNumberOfAttachments: ['if', true, 3, 1],
    } satisfies FormComponent<ComponentType.FileUpload>;
    expect(getNumberOfAttachmentsBounds(component, 'minNumberOfAttachments')).toEqual({});
  });
});
