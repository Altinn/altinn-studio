import { FormComponent } from './FormComponent';
import { FormContainer } from './FormContainer';
import { ComponentType } from '../components';

export type FormItem<T extends ComponentType = ComponentType> =
  ComponentType.Group extends T ? FormContainer : FormComponent<T>;
