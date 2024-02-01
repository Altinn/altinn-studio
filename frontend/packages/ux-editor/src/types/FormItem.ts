import type { FormComponent } from './FormComponent';
import type { FormContainer } from './FormContainer';
import type { ContainerComponentType } from './ContainerComponent';
import type { ComponentType } from 'app-shared/types/ComponentType';

export type FormItem<T extends ComponentType = ComponentType> = T extends ContainerComponentType
  ? FormContainer
  : FormComponent<T>;
