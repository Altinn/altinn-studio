import type { FormComponent } from './FormComponent';
import type { FormContainer } from './FormContainer';
import type { ContainerComponentType } from './ContainerComponent';
import type { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';

export type FormItem<T extends ComponentTypeV3 = ComponentTypeV3> = T extends ContainerComponentType
  ? FormContainer
  : FormComponent<T>;
