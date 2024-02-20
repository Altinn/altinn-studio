import type { IOption } from '../types/global';
import {
  addOptionToComponent,
  changeComponentOptionLabel,
  changeTextResourceBinding,
  getExpressionSchemaDefinitionReference,
  generateFormItem,
  getUnsupportedPropertyTypes,
  isPropertyTypeSupported,
  setComponentProperty,
} from './component';
import { ComponentType } from 'app-shared/types/ComponentType';
import type {
  FormCheckboxesComponent,
  FormComponent,
  FormRadioButtonsComponent,
} from '../types/FormComponent';
import type { ContainerComponentType } from '../types/ContainerComponent';
import { containerComponentTypes } from '../data/containerComponentTypes';

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
        itemType: 'COMPONENT',
        dataModelBindings: {},
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
        dataModelBindings: {},
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
        dataModelBindings: {},
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
        dataModelBindings: {},
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
        dataModelBindings: {},
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
    it('Sets given property on given component', () => {
      const component: FormComponent = {
        id: 'test',
        type: ComponentType.Input,
        itemType: 'COMPONENT',
        dataModelBindings: {},
      };
      const propertyKey = 'testProperty';
      const value = 'testValue';
      expect(setComponentProperty(component, propertyKey, value)).toEqual({
        ...component,
        [propertyKey]: value,
      });
    });
  });

  describe('getUnsupportedPropertyTypes', () => {
    it('Returns empty array when only valid properties are provided', () => {
      const properties = {
        testProperty1: {
          type: 'string',
        },
        testProperty2: {
          type: 'number',
        },
        testProperty3: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        testProperty4: {
          $ref: getExpressionSchemaDefinitionReference('boolean'),
        },
        testProperty5: {
          type: 'integer',
        },
        testProperty6: {
          type: 'object',
          properties: {
            testProperty6_1: {
              type: 'string',
            },
          },
        },
        testProperty7: {
          type: 'boolean',
        },
      };
      expect(getUnsupportedPropertyTypes(properties)).toEqual([]);
    });
    it('Returns empty array when no properties are provided', () => {
      const properties = {};
      expect(getUnsupportedPropertyTypes(properties)).toEqual([]);
    });
    it('Returns array of unsupported property keys when known unsupported property keys are provided', () => {
      const properties = {
        children: 'testValue',
        testProperty1: {
          type: 'object',
          properties: {},
          additionalProperties: {
            type: 'string',
          },
        },
      };
      expect(getUnsupportedPropertyTypes(properties, ['children'])).toEqual([
        'testProperty1',
        'children',
      ]);
    });
    it('Returns array of unsupported property keys when unsupported property keys are given', () => {
      const properties = {
        testProperty1: {
          $ref: 'testRef',
        },
        testProperty2: {
          type: 'array',
          items: {
            type: 'object',
          },
        },
        testProperty3: {
          type: 'string',
        },
      };
      const result = getUnsupportedPropertyTypes(properties);
      expect(result).toEqual(['testProperty1', 'testProperty2']);
    });
  });

  describe('isPropertyTypeSupported', () => {
    it('should return true if property type is supported', () => {
      expect(
        isPropertyTypeSupported({
          type: 'string',
        }),
      ).toBe(true);
    });

    it('should return true if property ref is supported', () => {
      ['boolean', 'number', 'integer', 'string'].forEach((type) => {
        expect(
          isPropertyTypeSupported({
            $ref: getExpressionSchemaDefinitionReference(type),
          }),
        ).toBe(true);
      });
    });

    it('should return false if property ref is supported', () => {
      ['object'].forEach((type) => {
        expect(
          isPropertyTypeSupported({
            $ref: getExpressionSchemaDefinitionReference(type),
          }),
        ).toBe(false);
      });
    });

    it('should return true for property of array type with items that are type string', () => {
      expect(
        isPropertyTypeSupported({
          type: 'array',
          items: {
            type: 'string',
          },
        }),
      ).toBe(true);
    });
    it('should return true for property type object with defined properties', () => {
      expect(
        isPropertyTypeSupported({
          type: 'object',
          properties: {
            test: {
              type: 'string',
            },
          },
        }),
      ).toBe(true);
    });

    it('should return false for property type object with no defined properties, but additionalProperties defined', () => {
      expect(
        isPropertyTypeSupported({
          type: 'object',
          properties: {},
          additionalProperties: {
            type: 'string',
          },
        }),
      ).toBe(false);
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
});
