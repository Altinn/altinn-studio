import type { ILayoutCompBase, ILayoutCompWillBeSavedWhileTyping } from 'src/layout/layout';

export interface ILayoutCompAddress extends ILayoutCompBase<'AddressComponent'>, ILayoutCompWillBeSavedWhileTyping {
  simplified?: boolean;
}

export interface IDataModelBindingsForAddress {
  address: string;
  zipCode: string;
  postPlace: string;
  careOf?: string;
  houseNumber?: string;
}
