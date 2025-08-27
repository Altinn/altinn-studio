import type { ComponentPropsWithRef, ElementType } from 'react';

/**
 * @deprecated Use `OverridableComponentProps` from `@studio/components` instead.
 */
export type OverridableComponentProps<ComponentProps, As extends ElementType> = {
  as?: As;
} & ComponentPropsWithRef<As> &
  Omit<ComponentProps, keyof ComponentPropsWithRef<As>>;
