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
  const { defaultProperties } = formItemConfigs[type];
  return { ...defaultProperties, id };
};

/**
 * Sets the given property of the given component to the given value.
 * @param component The component to set the property on.
 * @param propertyKey The property to set.
 * @param value The value to set the property to.
 * @returns The component with updated property.
 */
export const setComponentProperty = (
  component: FormComponent,
  propertyKey: string,
  value: any,
): FormComponent => ({
  ...component,
  [propertyKey]: value,
});

/**
 * Gets an array of unsupported property keys
 * @param properties The properties object to check.
 * @param knownUnsupportedPropertyKeys An array of additional known unsupported property keys.
 * @returns An array of unsupported property keys.
 */
export const getUnsupportedPropertyTypes = (
  properties: KeyValuePairs,
  knownUnsupportedPropertyKeys?: string[],
) => {
  const propertyKeys = Object.keys(properties);
  let unsupportedPropertyKeys = propertyKeys
    .filter((key) =>
      knownUnsupportedPropertyKeys ? !knownUnsupportedPropertyKeys.includes(key) : true,
    )
    .filter((key) => {
      return !isPropertyTypeSupported(properties[key]);
    });

  if (knownUnsupportedPropertyKeys) {
    unsupportedPropertyKeys = unsupportedPropertyKeys.concat(knownUnsupportedPropertyKeys);
  }

  return unsupportedPropertyKeys;
};

const supportedPropertyTypes = ['boolean', 'number', 'integer', 'string', 'object'];
const supportedPropertyRefs = [
  'https://altinncdn.no/schemas/json/layout/expression.schema.v1.json#/definitions/boolean',
];

/**
 * Checks if a given property with optional property key is supported by component config view.
 * @param property The property to check
 * @returns A boolean indicating if the property is supported.
 */
export const isPropertyTypeSupported = (property: KeyValuePairs) => {
  if (property?.$ref) {
    return supportedPropertyRefs.includes(property.$ref);
  }
  if (property?.type === 'array' && property?.items?.type === 'string') {
    return true;
  }
  return supportedPropertyTypes.includes(property?.type);
};
