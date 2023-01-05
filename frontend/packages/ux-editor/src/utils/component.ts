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
