import type { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { ComponentPreset } from '@altinn/ux-editor/types/ComponentPreset';
import { getFormItemConfig } from '../data/formItemConfig';
import type { FormItem } from '../types/FormItem';
import { getComponentDefinition } from '../data/componentCatalog';

// Add any properties that are rendered elsewhere to this list so they are not duplicated in the generic view
export const propertyKeysToExcludeFromComponentConfig = [
  'id',
  'type',
  'dataModelBindings',
  'textResourceBindings',
  'options',
  'optionsId',
];

/**
 * Generates a component with the given type and id and all the required properties set to some default values.
 * @param type The type of the component to generate.
 * @param id The id of the component to generate.
 * @returns A component of the given type.
 */
export const generateFormItem = <T extends ComponentType | ComponentPreset>(
  type: T,
  id: string,
): FormItem<T> => {
  const { defaultProperties, componentRef } = getFormItemConfig(type);
  const componentType = componentRef ? componentRef : type;

  return { ...defaultProperties, id, type: componentType } as FormItem<T>;
};

/**
 * Sets the given property of the given component to the given value.
 * If the value is undefined and the property is not required, the property is removed from the component.
 * @param component The component to set the property on.
 * @param propertyKey The property to set.
 * @param value The value to set the property to.
 * @returns The component with updated property.
 */
export const setComponentProperty = <T extends FormItem, K extends keyof T>(
  component: T,
  propertyKey: K,
  value: unknown,
): T => {
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

export const isComponentDeprecated = (type: ComponentType) => {
  return getComponentDefinition(type)?.metadata.lifecycle?.status === 'deprecated';
};

export const numberOfAttachmentsErrorCodes = [
  'minNumberOfAttachments_above_max',
  'maxNumberOfAttachments_below_min',
];

/**
 * Validates a new minimum or maximum number of attachments against the other one,
 * so that the minimum cannot be set above the maximum.
 * @param component The component the property belongs to.
 * @param propertyKey The property being edited.
 * @param value The new value of the property.
 * @returns One of numberOfAttachmentsErrorCodes, or an empty string if the value is valid.
 */
export const validateNumberOfAttachments = (
  component: FormItem,
  propertyKey: string,
  value: unknown,
): string => {
  if (typeof value !== 'number') return '';
  if (
    propertyKey === 'minNumberOfAttachments' &&
    'maxNumberOfAttachments' in component &&
    typeof component.maxNumberOfAttachments === 'number' &&
    value > component.maxNumberOfAttachments
  ) {
    return 'minNumberOfAttachments_above_max';
  }
  if (
    propertyKey === 'maxNumberOfAttachments' &&
    'minNumberOfAttachments' in component &&
    typeof component.minNumberOfAttachments === 'number' &&
    value < component.minNumberOfAttachments
  ) {
    return 'maxNumberOfAttachments_below_min';
  }
  return '';
};
