import type { IDataModelBindings, ITextResourceBindings } from './global';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { ContainerComponentType } from './ContainerComponent';
import type { GridSizes } from '../components/config/editModal/EditGrid/types/GridSizes';

export interface FormContainer<T extends ContainerComponentType = ContainerComponentType> {
  dataModelBindings?: IDataModelBindings;
  id: string;
  index?: number;
  itemType: 'CONTAINER';
  type: T;
  maxCount?: number;
  pageIndex?: number;
  tableHeaders?: string[];
  textResourceBindings?: ITextResourceBindings;
  propertyPath?: string;
  edit?: KeyValuePairs;
  grid?: GridSizes;
  [id: string]: any;
}
