import type { FormItem } from '../../../types/FormItem';
import type { UpdateFormMutateOptions } from '../../../containers/FormItemContext';
import type { JsonSchema } from 'app-shared/types/JsonSchema';

export interface BaseConfigProps {
  component: FormItem;
  handleComponentUpdate: (component: FormItem, mutateOptions?: UpdateFormMutateOptions) => void;
}

export interface SchemaConfigProps extends BaseConfigProps {
  schema: JsonSchema;
}
