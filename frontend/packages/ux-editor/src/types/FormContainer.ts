import type { IDataModelBindings, ITextResourceBindings } from './global';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { ContainerComponentType } from './ContainerComponent';

export interface FormContainer {
  dataModelBindings?: IDataModelBindings;
  id: string;
  index?: number;
  itemType: 'CONTAINER';
  type: ContainerComponentType;
  maxCount?: number;
  pageIndex?: number;
  tableHeaders?: string[];
  textResourceBindings?: ITextResourceBindings;
  propertyPath?: string;
  edit?: KeyValuePairs;
  [id: string]: any;
}
