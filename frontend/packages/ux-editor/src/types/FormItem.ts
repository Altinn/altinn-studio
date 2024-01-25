import type { FormComponent } from './FormComponent';
import type { FormContainer } from './FormContainer';
import type { ComponentType } from 'app-shared/types/ComponentType';

export type FormItem<T extends ComponentType = ComponentType> = ComponentType.Group extends T
  ? FormContainer
  : FormComponent<T>;
