import type { FormComponent } from './FormComponent';
import type { ContainerComponent, FormContainer } from './FormContainer';
import type { ComponentType } from 'app-shared/types/ComponentType';

export type FormItem<T extends ComponentType = ComponentType> = T extends ContainerComponent
  ? FormContainer
  : FormComponent<T>;
