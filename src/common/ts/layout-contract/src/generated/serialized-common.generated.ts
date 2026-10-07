import { IRawDataModelBinding } from '@app/layout-contract/generated/common.generated';

export interface IDataModelBindingsLikert {
  answer: IRawDataModelBinding;
  questions: IRawDataModelBinding;
}

export interface IDataModelBindingsList {
  list: IRawDataModelBinding;
}

export interface IDataModelBindingsOptionsSimple {
  simpleBinding: IRawDataModelBinding;
  label?: IRawDataModelBinding;
  metadata?: IRawDataModelBinding;
}

export interface IDataModelBindingsSimple {
  simpleBinding: IRawDataModelBinding;
}

// Source hash: a7dd79c4b2745286c4e450c472de0793838cecd38fc4e677aac7d9b85398a191
