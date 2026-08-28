import type { FormComponent } from './FormComponent';
import type { FormContainer } from './FormContainer';
import type { ContainerComponentType } from './ContainerComponent';
import type { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { ComponentPreset } from '@altinn/ux-editor/types/ComponentPreset';
import type { SimpleComponentType } from './SimpleComponentType';

export type FormItem<T extends ComponentType | ComponentPreset = ComponentType> =
  T extends ContainerComponentType
    ? FormContainer<T>
    : T extends SimpleComponentType
      ? FormComponent<T>
      : never;
