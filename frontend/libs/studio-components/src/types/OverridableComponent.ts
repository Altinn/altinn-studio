import type { RefAttributes, FC, ElementType } from 'react';
import type { OverridableComponentProps } from './OverridableComponentProps';

export type OverridableComponent<ComponentProps, Element extends HTMLElement> = {
  (props: ComponentProps & RefAttributes<Element>): ReturnType<FC>;
  <As extends ElementType>(props: OverridableComponentProps<ComponentProps, As>): ReturnType<FC>;
} & Pick<FC, 'displayName'>;
