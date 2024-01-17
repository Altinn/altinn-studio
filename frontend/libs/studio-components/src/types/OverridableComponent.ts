import type { RefAttributes, FC, ElementType, ComponentPropsWithRef } from 'react';

export type OverridableComponent<ComponentProps, Element extends HTMLElement> = {
  (props: ComponentProps & RefAttributes<Element>): ReturnType<FC>;
  <As extends ElementType>(
    props: {
      as?: As;
    } & ComponentProps &
      Omit<ComponentPropsWithRef<As>, keyof ComponentProps>,
  ): ReturnType<FC>;
} & Pick<FC, 'displayName'>;
