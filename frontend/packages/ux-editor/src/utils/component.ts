import type { IOption } from '../types/global';
import { generateRandomId } from 'app-shared/utils/generateRandomId';
import type {
  FormCheckboxesComponent,
  FormComponent,
  FormRadioButtonsComponent,
} from '../types/FormComponent';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { formItemConfigs } from '../data/formItemConfig';
import type { FormItem } from '../types/FormItem';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { FilterKeysOfType } from 'app-shared/types/FilterKeysOfType';

export function getTextResourceByAddressKey(key: AddressKeys, t: (key: string) => string): string {
  switch (key) {
    case AddressKeys.address: {
      return t('ux_editor.modal_configure_address_component_address');
    }
    case AddressKeys.zipCode: {
      return t('ux_editor.modal_configure_address_component_zip_code');
    }
    case AddressKeys.houseNumber: {
      return t('ux_editor.modal_configure_address_component_house_number');
    }
    case AddressKeys.careOf: {
      return t('ux_editor.modal_configure_address_component_care_of');
    }
    case AddressKeys.postPlace: {
      return t('ux_editor.modal_configure_address_component_post_place');
    }
    default: {
      return '';
    }
  }
}

export enum AddressKeys {
  address = 'address',
  zipCode = 'zipCode',
  postPlace = 'postPlace',
  careOf = 'careOf',
  houseNumber = 'houseNumber',
}

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
      // Not all schemas with enum value explicitly specifies type as string
      return baseMatch || !!property.enum;
    case PropertyTypes.array:
      // Currently only supporting array of strings with specified enum values
      return baseMatch && !!property.items?.enum;
    case PropertyTypes.object:
      // Currently only supporting object with specifiec properties and no additional properties
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

export const addOptionToComponent = <T extends FormCheckboxesComponent | FormRadioButtonsComponent>(
  component: T,
  option: IOption,
): T => ({
  ...component,
  options: [...component.options, option],
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
export const generateFormItem = <T extends ComponentType>(type: T, id: string): FormItem<T> => {
  const { defaultProperties, itemType } = formItemConfigs[type];
  return { ...defaultProperties, id, type, itemType } as FormItem<T>;
};

/**
 * Sets the given property of the given component to the given value.
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
): FormItem<T> => ({
  ...component,
  [propertyKey]: value,
});

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
  .filter((p) => p !== 'object' && p !== 'array')
  .map((type) => getExpressionSchemaDefinitionReference(type));

/**
 * Checks if a given property with optional property key is supported by component config view.
 * @param property The property to check
 * @returns A boolean indicating if the property is supported.
 */
export const isPropertyTypeSupported = (property: KeyValuePairs) => {
  if (property?.$ref) {
    return supportedPropertyRefs.includes(property.$ref);
  }

  return supportedPropertyTypes.includes(property?.type);
};
