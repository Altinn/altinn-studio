import type { FormItem } from '../../../types/FormItem';
import type { UpdateFormMutateOptions } from '../../../containers/FormItemContext';

export interface BaseConfigProps {
  component: FormItem;
  handleComponentUpdate: (component: FormItem, mutateOptions?: UpdateFormMutateOptions) => void;
}

export interface SchemaConfigProps extends BaseConfigProps {
  schema: any;
}
