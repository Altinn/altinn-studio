import { IDataModelBindings, ITextResourceBindings } from './global';

export interface FormContainer {
  dataModelBindings?: IDataModelBindings;
  id?: string;
  index?: number;
  itemType: 'CONTAINER';
  maxCount?: number;
  tableHeaders?: string[];
  textResourceBindings?: ITextResourceBindings;
}
