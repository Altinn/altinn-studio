import type { IDataModelBindingsKeyValueExplicit, ITextResourceBindings } from './global';
import type { ContainerComponentType } from './ContainerComponent';
import type { ComponentSpecificConfig } from 'app-shared/types/ComponentSpecificConfig';
import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

export type FormContainer<T extends ContainerComponentType = ContainerComponentType> = {
  [containerType in ContainerComponentType]: ContainerBase<containerType> &
    ComponentSpecificConfig<containerType>;
}[T];

type ContainerBase<T extends ContainerComponentType> = Pick<
  ComponentBase,
  'id' | 'hidden' | 'grid' | 'pageBreak'
> & {
  dataModelBindings?: IDataModelBindingsKeyValueExplicit;
  index?: number;
  textResourceBindings?: ITextResourceBindings;
  type: T;
};
