import { IDataModelBindings, ITextResourceBindings } from './global';
import { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export interface FormContainer {
  dataModelBindings?: IDataModelBindings;
  id?: string;
  index?: number;
  itemType: 'CONTAINER';
  maxCount?: number;
  tableHeaders?: string[];
  textResourceBindings?: ITextResourceBindings;
  propertyPath?: string;
  edit?: KeyValuePairs;
  [id: string]: any;
}
