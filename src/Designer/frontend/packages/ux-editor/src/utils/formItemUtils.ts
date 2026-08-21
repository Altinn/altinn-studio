import type { FormComponent } from '../types/FormComponent';
import type { FormContainer } from '../types/FormContainer';
import { formItemConfigs } from '../data/formItemConfig';
import { LayoutItemType } from '../types/global';

export const isContainer = (item: FormComponent | FormContainer): item is FormContainer =>
  formItemConfigs[item.type]?.itemType === LayoutItemType.Container;
