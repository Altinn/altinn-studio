import { FormComponent } from './FormComponent';
import { FormContainer } from './FormContainer';
import { FormItemType } from 'app-shared/types/FormItemType';

export type FormItem<T extends FormItemType = FormItemType> =
  FormItemType.Group extends T ? FormContainer : FormComponent<T>;
