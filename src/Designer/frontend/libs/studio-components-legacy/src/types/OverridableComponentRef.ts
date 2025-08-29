import type { ComponentPropsWithRef, ElementType } from 'react';

/**
 * @deprecated Use `OverridableComponentRef` from `@studio/components` instead.
 */
export type OverridableComponentRef<As extends ElementType> = ComponentPropsWithRef<As>['ref'];
