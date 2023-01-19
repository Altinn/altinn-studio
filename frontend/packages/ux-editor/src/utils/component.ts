import {
  IFormComponent,
  IFormGenericOptionsComponent,
  IOption
} from '../types/global';

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
  component: IFormComponent,
  bindingKey: string,
  resourceKey: string
): IFormComponent => ({
  ...component,
  textResourceBindings: {
    ...component.textResourceBindings,
    [bindingKey]: resourceKey,
  }
});

export const changeTitleBinding = (component: IFormComponent, resourceKey: string): IFormComponent =>
  changeTextResourceBinding(component, 'title', resourceKey);

export const changeDescriptionBinding = (component: IFormComponent, resourceKey: string): IFormComponent =>
  changeTextResourceBinding(component, 'description', resourceKey);

export const addOptionToComponent = <T extends IFormGenericOptionsComponent>(
  component: T,
  option: IOption
): T => ({
  ...component,
  options: [
    ...component.options,
    option,
  ],
});

export const changeComponentOptionLabel = <T extends IFormGenericOptionsComponent>(
  component: T,
  value: string,
  label: string
): T => ({
  ...component,
  options: component.options?.map((option) => {
    return option.value === value ? { ...option, label } : option;
  })
});
