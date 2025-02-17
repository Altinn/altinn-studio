import type { IOption } from '../types/global';
import { generateRandomId } from 'app-shared/utils/generateRandomId';
import type {
  FormCheckboxesComponent,
  FormComponent,
  FormRadioButtonsComponent,
  SelectionComponentType,
} from '../types/FormComponent';
import { ComponentType, type CustomComponentType } from 'app-shared/types/ComponentType';
import { formItemConfigs } from '../data/formItemConfig';
import type { FormItem } from '../types/FormItem';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { FilterKeysOfType } from 'app-shared/types/FilterKeysOfType';

export enum PropertyTypes {
  boolean = 'boolean',
  number = 'number',
  integer = 'integer',
  string = 'string',
  object = 'object',
  array = 'array',
}

// Add any properties that are rendered elsewhere to this list so they are not duplicated in the generic view
export const propertyKeysToExcludeFromComponentConfig = [
  'id',
  'type',
  'dataModelBindings',
  'textResourceBindings',
  'options',
  'optionsId',
];

export const changeTextResourceBinding = (
  component: FormComponent,
  bindingKey: string,
  resourceKey: string,
): FormComponent => ({
  ...component,
  textResourceBindings: {
    ...component.textResourceBindings,
    [bindingKey]: resourceKey,
  },
});

/**
 * Function that returns true if the given property matches the required
 * conditions for the provided property type.
 * @param propertyKey The key of the property to check.
 * @param propertyType The expected property type to check for.
 * @param properties The properties to check.
 * @returns
 */
export const propertyTypeMatcher = (property: KeyValuePairs, propertyType: PropertyTypes) => {
  if (!property) return false;
  const baseMatch =
    property.type === propertyType ||
    property.$ref?.endsWith(getExpressionSchemaDefinitionReference(propertyType));

  switch (propertyType) {
    case PropertyTypes.string:
      // Not all schemas with enum value explicitly specify type as string
      return baseMatch || (!!property.enum && typeof property.enum[0] === 'string');
    case PropertyTypes.number:
      // Not all schemas with enum value explicitly specify type as number
      return baseMatch || (!!property.enum && typeof property.enum[0] === 'number');
    case PropertyTypes.array:
      // Currently only supporting array of strings with specified enum values
      return baseMatch && !!property.items?.enum;
    case PropertyTypes.object:
      // Currently only supporting object with specific properties and no additional properties
      return baseMatch && !!property.properties && !property.additionalProperties;
    default:
      return baseMatch;
  }
};

/**
 * Function that returns an array of supported property keys for the given property type(s).
 * @param properties The properties to check.
 * @param propertyTypes The expected property types to check for.
 * @param excludeKeys Property keys that should be excluded from the result.
 * @returns An array of supported property keys.
 */
export const getSupportedPropertyKeysForPropertyType = (
  properties: KeyValuePairs,
  propertyTypes: PropertyTypes[],
  excludeKeys: string[] = [],
) => {
  return Object.keys(properties).filter((key) => {
    if (
      !properties[key] ||
      !isPropertyTypeSupported(properties[key]) ||
      excludeKeys.includes(key) ||
      propertyKeysToExcludeFromComponentConfig.includes(key)
    )
      return false;

    return propertyTypes.find((propertyType) => propertyTypeMatcher(properties[key], propertyType));
  });
};

export const changeTitleBinding = (component: FormComponent, resourceKey: string): FormComponent =>
  changeTextResourceBinding(component, 'title', resourceKey);

export const changeDescriptionBinding = (
  component: FormComponent,
  resourceKey: string,
): FormComponent => changeTextResourceBinding(component, 'description', resourceKey);

export const addOptionToComponent = <T extends FormComponent<SelectionComponentType>>(
  component: T,
  option: IOption,
): T => ({
  ...component,
  options: [...(component.options || []), option],
});

export const changeComponentOptionLabel = <
  T extends FormCheckboxesComponent | FormRadioButtonsComponent,
>(
  component: T,
  value: string,
  label: string,
): T => ({
  ...component,
  options: component.options?.map((option) => {
    return option.value === value ? { ...option, label } : option;
  }),
});

export const generateRandomOption = (): IOption => ({ label: '', value: generateRandomId(4) });

/**
 * Generates a component with the given type and id and all the required properties set to some default values.
 * @param type The type of the component to generate.
 * @param id The id of the component to generate.
 * @returns A component of the given type.
 */
export const generateFormItem = <T extends ComponentType | CustomComponentType>(
  type: T,
  id: string,
): FormItem<T> => {
  const { defaultProperties, itemType, componentRef } = formItemConfigs[type];
  const componentType = componentRef ? componentRef : type;

  return { ...defaultProperties, id, type: componentType, itemType } as FormItem<T>;
};

/**
 * Sets the given property of the given component to the given value.
 * If the value is undefined and the property is not required, the property is removed from the component.
 * @param component The component to set the property on.
 * @param propertyKey The property to set.
 * @param value The value to set the property to.
 * @returns The component with updated property.
 */
export const setComponentProperty = <
  T extends ComponentType,
  V,
  K extends FilterKeysOfType<FormItem<T>, V>,
>(
  component: FormItem<T>,
  propertyKey: K,
  value: V,
): FormItem<T> => {
  if (!component['required'] && value === undefined) {
    const updatedComponent = { ...component };
    delete updatedComponent[propertyKey];
    return updatedComponent;
  }

  return {
    ...component,
    [propertyKey]: value,
  };
};

export const EXPRESSION_SCHEMA_BASE_DEFINITION_REFERENCE =
  'expression.schema.v1.json#/definitions/' as const;

export const getExpressionSchemaDefinitionReference = (type: PropertyTypes) => {
  return `${EXPRESSION_SCHEMA_BASE_DEFINITION_REFERENCE}${type}`;
};

const supportedPropertyTypes = [
  PropertyTypes.boolean,
  PropertyTypes.number,
  PropertyTypes.integer,
  PropertyTypes.string,
  PropertyTypes.object,
  PropertyTypes.array,
];
const supportedPropertyRefs = supportedPropertyTypes
  .filter((p) => p !== PropertyTypes.object && p !== PropertyTypes.array)
  .map((type) => getExpressionSchemaDefinitionReference(type));

/**
 * Checks if a given property with optional property key is supported by component config view.
 * @param property The property to check
 * @returns A boolean indicating if the property is supported.
 */
export const isPropertyTypeSupported = (property: KeyValuePairs) => {
  if (property.enum) return true;
  if (property?.$ref) {
    return supportedPropertyRefs.includes(property.$ref);
  }

  return supportedPropertyTypes.includes(property?.type);
};

export const isComponentDeprecated = (type: ComponentType) => {
  const deprecatedComponents = [ComponentType.Summary];
  return deprecatedComponents.includes(type);
};
