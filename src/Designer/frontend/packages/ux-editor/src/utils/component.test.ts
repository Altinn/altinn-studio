import type { IOption } from '../types/global';
import {
  addOptionToComponent,
  changeComponentOptionLabel,
  changeTextResourceBinding,
  getExpressionSchemaDefinitionReference,
  generateFormItem,
  isPropertyTypeSupported,
  setComponentProperty,
  EXPRESSION_SCHEMA_BASE_DEFINITION_REFERENCE,
  PropertyTypes,
  propertyTypeMatcher,
  getSupportedPropertyKeysForPropertyType,
  isComponentDeprecated,
} from './component';
import { ComponentType, CustomComponentType } from 'app-shared/types/ComponentType';
import type {
  FormCheckboxesComponent,
  FormComponent,
  FormRadioButtonsComponent,
} from '../types/FormComponent';
import type { ContainerComponentType } from '../types/ContainerComponent';
import { containerComponentTypes } from '../data/containerComponentTypes';
import { formItemConfigs } from '../data/formItemConfig';

describe('Component utils', () => {
  describe('changeTextResourceBinding', () => {
    it('Changes given text resource binding and nothing else', () => {
      const bindingKeyToKeep = 'testKey';
      const resourceKeyToKeep = 'testResourceKey';
      const bindingKeyToChange = 'testKeyToChange';
      const resourceKeyToChange = 'testResourceKeyToChange';
      const newResourceKey = 'newResourceKey';
      const component: FormComponent = {
        id: 'test',
        textResourceBindings: {
          [bindingKeyToKeep]: resourceKeyToKeep,
          [bindingKeyToChange]: resourceKeyToChange,
        },
        type: ComponentType.Input,
        dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
        itemType: 'COMPONENT',
      };
      expect(changeTextResourceBinding(component, bindingKeyToChange, newResourceKey)).toEqual({
        ...component,
        textResourceBindings: {
          [bindingKeyToKeep]: resourceKeyToKeep,
          [bindingKeyToChange]: newResourceKey,
        },
      });
    });
  });

  describe('changeTitleBinding', () => {
    it('Changes title binding', () => {
      const titleResourceKey = 'testResourceKey';
      const newResourceKey = 'newResourceKey';
      const component: FormComponent = {
        id: 'test',
        textResourceBindings: {
          title: titleResourceKey,
        },
        type: ComponentType.Input,
        itemType: 'COMPONENT',
        dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
      };
      expect(
        changeTextResourceBinding(component, 'title', newResourceKey).textResourceBindings.title,
      ).toEqual(newResourceKey);
    });
  });

  describe('changeDescriptionBinding', () => {
    it('Changes description binding', () => {
      const descriptionResourceKey = 'testResourceKey';
      const newResourceKey = 'newResourceKey';
      const component: FormComponent = {
        id: 'test',
        textResourceBindings: {
          description: descriptionResourceKey,
        },
        type: ComponentType.Input,
        itemType: 'COMPONENT',
        dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
      };
      expect(
        changeTextResourceBinding(component, 'description', newResourceKey).textResourceBindings
          .description,
      ).toEqual(newResourceKey);
    });
  });

  describe('addOptionToComponent', () => {
    it.each([ComponentType.Checkboxes, ComponentType.RadioButtons] as (
      | ComponentType.Checkboxes
      | ComponentType.RadioButtons
    )[])('Adds option to %s component', (componentType) => {
      const component: FormCheckboxesComponent | FormRadioButtonsComponent = {
        id: 'test',
        type: componentType,
        options: [
          {
            label: 'testLabel',
            value: 'testValue',
          },
        ],
        optionsId: null,
        itemType: 'COMPONENT',
        dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
      };
      const newOption: IOption = {
        label: 'newTestLabel',
        value: 'newTestValue',
      };
      expect(addOptionToComponent(component, newOption)).toEqual({
        ...component,
        options: [...component.options, newOption],
      });
    });
  });

  describe('changeComponentOptionLabel', () => {
    it.each([ComponentType.Checkboxes, ComponentType.RadioButtons] as (
      | ComponentType.Checkboxes
      | ComponentType.RadioButtons
    )[])('Changes label of option with given value on %s component', (componentType) => {
      const valueOfWhichLabelShouldChange = 'testValue2';
      const component: FormCheckboxesComponent | FormRadioButtonsComponent = {
        id: 'test',
        type: componentType,
        options: [
          {
            label: 'testLabel',
            value: 'testValue',
          },
          {
            label: 'testLabel2',
            value: valueOfWhichLabelShouldChange,
          },
        ],
        optionsId: null,
        itemType: 'COMPONENT',
        dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
      };
      const newLabel = 'newTestLabel';
      expect(
        changeComponentOptionLabel(component, valueOfWhichLabelShouldChange, newLabel).options,
      ).toEqual(
        expect.arrayContaining([
          {
            label: newLabel,
            value: valueOfWhichLabelShouldChange,
          },
        ]),
      );
    });
  });

  describe('generateFormItem', () => {
    it.each(Object.values(ComponentType).filter((v) => !containerComponentTypes.includes(v)))(
      'Generates component of type %s with given ID',
      (componentType) => {
        const id = 'testId';
        const component = generateFormItem(componentType, id);
        expect(component).toEqual(
          expect.objectContaining({
            id,
            type: componentType,
            itemType: 'COMPONENT',
          }),
        );
      },
    );

    it('maps custom component type to correct component reference', () => {
      expect(formItemConfigs[CustomComponentType.CloseSubformButton].componentRef).toBe(
        ComponentType.CustomButton,
      );
    });

    it('generates a form item with the correct structure for a custom component type', () => {
      const component = generateFormItem(CustomComponentType.CloseSubformButton, 'testId');

      expect(component).toEqual(
        expect.objectContaining({
          id: 'testId',
          type: ComponentType.CustomButton,
          itemType: 'COMPONENT',
        }),
      );
    });

    it.each(containerComponentTypes)(
      'Generates container of type %s with given ID',
      (componentType: ContainerComponentType) => {
        const id = 'testId';
        const component = generateFormItem(componentType, id);
        expect(component).toEqual(
          expect.objectContaining({
            id,
            type: componentType,
            itemType: 'CONTAINER',
          }),
        );
      },
    );
  });

  describe('setComponentProperty', () => {
    const component: FormComponent = {
      id: 'test',
      type: ComponentType.Input,
      itemType: 'COMPONENT',
      dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
    };
    const propertyKey = 'testProperty';

    it('Sets given property on given component', () => {
      const value = 'testValue';
      expect(setComponentProperty(component, propertyKey, value)).toEqual({
        ...component,
        [propertyKey]: value,
      });
    });
    it('Removes property if value is undefined', () => {
      expect(setComponentProperty(component, propertyKey, undefined)).toEqual({
        ...component,
      });
    });
  });

  describe('isPropertyTypeSupported', () => {
    it('should return true if property type is supported', () => {
      [
        PropertyTypes.boolean,
        PropertyTypes.number,
        PropertyTypes.integer,
        PropertyTypes.string,
        PropertyTypes.object,
        PropertyTypes.array,
      ].forEach((type) => {
        expect(
          isPropertyTypeSupported({
            type,
          }),
        ).toBe(true);
      });
    });

    it('should return true if property ref is supported', () => {
      [
        PropertyTypes.boolean,
        PropertyTypes.number,
        PropertyTypes.integer,
        PropertyTypes.string,
      ].forEach((type) => {
        expect(
          isPropertyTypeSupported({
            $ref: getExpressionSchemaDefinitionReference(type),
          }),
        ).toBe(true);
      });
    });

    it('should return true if property enum is supported', () => {
      expect(
        isPropertyTypeSupported({
          enum: ['enumValue1', 'enumValue2'],
        }),
      ).toBe(true);
    });
  });

  it('should return false if property ref is not supported', () => {
    [PropertyTypes.object, PropertyTypes.array].forEach((type) => {
      expect(
        isPropertyTypeSupported({
          $ref: getExpressionSchemaDefinitionReference(type),
        }),
      ).toBe(false);
    });
  });

  it('should return false if property ref is not supported', () => {
    expect(
      isPropertyTypeSupported({
        $ref: 'test',
      }),
    ).toBe(false);
  });

  it('should return true if property type is supported and propertyKey is undefined', () => {
    expect(
      isPropertyTypeSupported({
        type: 'string',
      }),
    ).toBe(true);
  });
});

describe('getExpressionSchemaDefinitionReference', () => {
  it('should return correct reference for given type', () => {
    expect(getExpressionSchemaDefinitionReference(PropertyTypes.array)).toBe(
      `${EXPRESSION_SCHEMA_BASE_DEFINITION_REFERENCE}array`,
    );
  });
});

describe('propertyTypeMatcher', () => {
  it('should return false if property does not exist', () => {
    expect(propertyTypeMatcher(undefined, PropertyTypes.string)).toBe(false);
  });

  it('should return true if property type matches', () => {
    expect(propertyTypeMatcher({ type: 'string' }, PropertyTypes.string)).toBe(true);
  });

  it('should return false if property type does not match', () => {
    expect(propertyTypeMatcher({ type: 'number' }, PropertyTypes.string)).toBe(false);
  });

  it('should return true if property has a supported ref', () => {
    expect(
      propertyTypeMatcher(
        {
          $ref: getExpressionSchemaDefinitionReference(PropertyTypes.string),
        },
        PropertyTypes.string,
      ),
    ).toBe(true);
  });

  it('should return true for a property of string type with enum even if type: string is not defined explicitly', () => {
    expect(
      propertyTypeMatcher(
        {
          enum: ['test'],
        },
        PropertyTypes.string,
      ),
    ).toBe(true);
  });

  it('should return false for a property with no type defined and no enum defined', () => {
    expect(propertyTypeMatcher({ something: 'test' }, PropertyTypes.string)).toBe(false);
  });

  it('should return true for a property of array type with items that have enum value', () => {
    expect(
      propertyTypeMatcher(
        {
          type: 'array',
          items: {
            enum: ['test'],
          },
        },
        PropertyTypes.array,
      ),
    ).toBe(true);
  });

  it('should return false for a property of array type with items that have no enum value', () => {
    expect(
      propertyTypeMatcher(
        {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        PropertyTypes.array,
      ),
    ).toBe(false);
  });

  it('should return false for a property of array type with no items defined', () => {
    expect(propertyTypeMatcher({ type: 'array' }, PropertyTypes.array)).toBe(false);
  });

  it('should return false for a property of object type with no properties defined', () => {
    expect(propertyTypeMatcher({ type: 'object' }, PropertyTypes.object)).toBe(false);
  });

  it('should return false for a property of object type with additionalProperties defined', () => {
    expect(
      propertyTypeMatcher(
        {
          type: 'object',
          properties: {},
          additionalProperties: {
            type: 'string',
          },
        },
        PropertyTypes.object,
      ),
    ).toBe(false);
  });

  it('should return true for a property of object type with defined properties and no additionalProperties', () => {
    expect(
      propertyTypeMatcher(
        {
          type: 'object',
          properties: {
            testProperty: {
              type: 'string',
            },
          },
        },
        PropertyTypes.object,
      ),
    ).toBe(true);
  });
});

describe('getSupportedPropertyKeysForPropertyType', () => {
  it('should return empty array if no properties are provided', () => {
    expect(getSupportedPropertyKeysForPropertyType({}, [PropertyTypes.string])).toEqual([]);
  });

  it('should return empty array if no property keys are of the expected property types', () => {
    expect(
      getSupportedPropertyKeysForPropertyType(
        {
          testProperty: {
            type: 'number',
          },
        },
        [PropertyTypes.string],
      ),
    ).toEqual([]);
  });

  it('should return array of property keys of the expected property types', () => {
    expect(
      getSupportedPropertyKeysForPropertyType(
        {
          testProperty: {
            type: 'string',
          },
          testProperty2: {
            type: 'number',
          },
        },
        [PropertyTypes.string],
      ),
    ).toEqual(['testProperty']);
  });

  it('should only return property keys that are not in the excludeKeys array', () => {
    expect(
      getSupportedPropertyKeysForPropertyType(
        {
          testProperty: {
            type: 'string',
          },
          testProperty1: {
            type: 'string',
          },
          testProperty2: {
            type: 'number',
          },
        },
        [PropertyTypes.string],
        ['testProperty'],
      ),
    ).toEqual(['testProperty1']);
  });
});

describe('isComponentDeprecated', () => {
  it('should return true if component is deprecated', () => {
    expect(isComponentDeprecated(ComponentType.Summary)).toBe(true);
  });

  it('should return false if component is not deprecated', () => {
    expect(isComponentDeprecated(ComponentType.Input)).toBe(false);
  });
});
