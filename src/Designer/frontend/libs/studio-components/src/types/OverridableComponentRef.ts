import type { ComponentPropsWithRef, ElementType } from 'react';

export type OverridableComponentRef<As extends ElementType> = ComponentPropsWithRef<As>['ref'];
