import type { IDataModelBindingsKeyValueExplicit, ITextResourceBindings } from './global';
import type { ContainerComponentType } from './ContainerComponent';
import type { ComponentConfig } from './ComponentConfig';
import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

export type FormContainer<T extends ContainerComponentType = ContainerComponentType> = {
  [containerType in ContainerComponentType]: ContainerBase<containerType> &
    ComponentConfig<containerType>;
}[T];

type ContainerBase<T extends ContainerComponentType> = Pick<
  ComponentBase,
  'id' | 'hidden' | 'grid' | 'pageBreak'
> & {
  dataModelBindings?: IDataModelBindingsKeyValueExplicit;
  index?: number;
  textResourceBindings?: ITextResourceBindings;
  customProperties?: Record<string, unknown>;
  type: T;
};
