import type { FormItem } from '../../../types/FormItem';
import type { UpdateFormMutateOptions } from '../../../containers/FormItemContext';
import type { PropertyDefinition } from '@app/layout-contract';

export interface BaseConfigProps {
  component: FormItem;
  handleComponentUpdate: (component: FormItem, mutateOptions?: UpdateFormMutateOptions) => void;
}

export interface CatalogConfigProps extends BaseConfigProps {
  properties: Readonly<Record<string, PropertyDefinition>>;
}
