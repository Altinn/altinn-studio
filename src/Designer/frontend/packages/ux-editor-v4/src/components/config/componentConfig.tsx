import type { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from '../../types/FormItem';
import type { UpdateFormMutateOptions } from '../../containers/FormItemContext';

export interface IGenericEditComponent<T extends ComponentType = ComponentType> {
  editFormId?: string;
  component: FormItem<T>;
  handleComponentChange: (component: FormItem<T>, mutateOptions?: UpdateFormMutateOptions) => void;
  layoutName?: string;
}
