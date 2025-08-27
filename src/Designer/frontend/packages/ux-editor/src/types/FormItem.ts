import type { FormComponent } from './FormComponent';
import type { FormContainer } from './FormContainer';
import type { ContainerComponentType } from './ContainerComponent';
import type { ComponentType, CustomComponentType } from 'app-shared/types/ComponentType';
import type { SimpleComponentType } from './SimpleComponentType';

export type FormItem<T extends ComponentType | CustomComponentType = ComponentType> =
  T extends ContainerComponentType
    ? FormContainer<T>
    : T extends SimpleComponentType
      ? FormComponent<T>
      : never;
