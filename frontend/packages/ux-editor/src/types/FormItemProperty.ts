import type { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from './FormItem';

export type FormItemProperty<
  Type extends ComponentType = ComponentType,
  Key extends keyof FormItem<Type> = keyof FormItem<Type>,
> = {
  [T in Type]: {
    [K in Key]: {
      key: K;
      subKey?: keyof FormItem<T>[K];
    };
  }[Key];
}[Type];
