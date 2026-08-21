import type { IDataModelBindingsKeyValueExplicit, ITextResourceBindings } from './global';
import type { ContainerComponentType } from './ContainerComponent';
import type { BooleanExpression, StringExpression } from '@studio/components';
import type { ComponentSpecificConfig } from 'app-shared/types/ComponentSpecificConfig';
import type { IGrid } from '@app/layout-contract/generated/common.generated';

export type FormContainer<T extends ContainerComponentType = ContainerComponentType> = {
  [containerType in ContainerComponentType]: ContainerBase<containerType> &
    ComponentSpecificConfig<containerType>;
}[T];

type ContainerBase<T extends ContainerComponentType> = {
  dataModelBindings?: IDataModelBindingsKeyValueExplicit;
  grid?: IGrid;
  hidden?: BooleanExpression;
  id: string;
  index?: number;
  pageBreak?: PageBreak;
  textResourceBindings?: ITextResourceBindings;
  type: T;
};

type PageBreak = {
  breakBefore?: StringExpression;
  breakAfter?: StringExpression;
};
