export interface IFetchFormDataFulfilled {
  formData: any;
}

export interface ISingleFieldValidation {
  layoutId: string;
  dataModelBinding: string;
}

export interface ISaveAction {
  field?: string;
  componentId?: string;
  singleFieldValidation?: ISingleFieldValidation;
}

export interface IUpdateFormData {
  skipValidation?: boolean;
  skipAutoSave?: boolean;
  singleFieldValidation?: ISingleFieldValidation;
  componentId: string;
  field: string;
}

export interface IUpdateFormDataSimple extends IUpdateFormData {
  data: string | undefined | null;
}

export interface IUpdateFormDataAddToList extends IUpdateFormData {
  itemToAdd: string;
}

export interface IUpdateFormDataRemoveFromList extends IUpdateFormData {
  itemToRemove: string;
}
