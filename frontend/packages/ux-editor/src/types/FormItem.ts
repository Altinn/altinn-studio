import { FormComponent } from './FormComponent';
import { FormContainer } from './FormContainer';
import { ComponentType } from 'app-shared/types/ComponentType';

export type FormItem<T extends ComponentType = ComponentType> =
  ComponentType.Group extends T ? FormContainer : FormComponent<T>;
