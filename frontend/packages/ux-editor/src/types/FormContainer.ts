import { IDataModelBindings, ITextResourceBindings } from './global';

export interface FormContainer {
  index?: number;
  itemType: 'CONTAINER';
  dataModelBindings?: IDataModelBindings;
  maxCount?: number;
  textResourceBindings?: ITextResourceBindings;
  tableHeaders?: string[];
}
