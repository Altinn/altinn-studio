import { IOption } from '../types/global';
import { generateRandomId } from 'app-shared/utils/generateRandomId';
import type { FormComponent } from '../types/FormComponent';
import type { FormCheckboxesComponent, FormRadioButtonsComponent } from '../types/FormComponent';

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
  resourceKey: string
): FormComponent => ({
  ...component,
  textResourceBindings: {
    ...component.textResourceBindings,
    [bindingKey]: resourceKey,
  }
});

export const changeTitleBinding = (component: FormComponent, resourceKey: string): FormComponent =>
  changeTextResourceBinding(component, 'title', resourceKey);

export const changeDescriptionBinding = (component: FormComponent, resourceKey: string): FormComponent =>
  changeTextResourceBinding(component, 'description', resourceKey);

export const addOptionToComponent = <T extends FormCheckboxesComponent | FormRadioButtonsComponent>(
  component: T,
  option: IOption
): T => ({
  ...component,
  options: [
    ...component.options,
    option,
  ],
});

export const changeComponentOptionLabel = <T extends FormCheckboxesComponent | FormRadioButtonsComponent>(
  component: T,
  value: string,
  label: string
): T => ({
  ...component,
  options: component.options?.map((option) => {
    return option.value === value ? { ...option, label } : option;
  })
});

export const generateRandomOption = (): IOption =>
  ({ label: '', value: generateRandomId(4) });
