import type { ComponentPropsWithRef, ElementType } from 'react';

export type OverridableComponentProps<ComponentProps, As extends ElementType> = {
  as?: As;
} & ComponentPropsWithRef<As> &
  Omit<ComponentProps, keyof ComponentPropsWithRef<As>>;
