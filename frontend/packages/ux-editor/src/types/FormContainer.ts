import type { IDataModelBindingsKeyValueExplicit, ITextResourceBindings } from './global';
import type { ContainerComponentType } from './ContainerComponent';
import type { BooleanExpression, StringExpression } from '@studio/components-legacy';
import type { ComponentSpecificConfig } from 'app-shared/types/ComponentSpecificConfig';
import type { GridSizes } from '../components/FormDesigner/Properties/config/editModal/EditGrid/types/GridSizes';

export type FormContainer<T extends ContainerComponentType = ContainerComponentType> = {
  [containerType in ContainerComponentType]: ContainerBase<containerType> &
    ComponentSpecificConfig<containerType>;
}[T];

type ContainerBase<T extends ContainerComponentType> = {
  dataModelBindings?: IDataModelBindingsKeyValueExplicit;
  grid?: GridSizes;
  hidden?: BooleanExpression;
  id: string;
  index?: number;
  itemType: 'CONTAINER';
  pageBreak?: PageBreak;
  pageIndex?: number;
  propertyPath?: string;
  textResourceBindings?: ITextResourceBindings;
  type: T;
};

type PageBreak = {
  breakBefore?: StringExpression;
  breakAfter?: StringExpression;
};
