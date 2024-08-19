import type { ForwardRefExoticComponent, PropsWithoutRef, RefAttributes } from 'react';

export type InputCellComponent<Props, Element> = ForwardRefExoticComponent<
  PropsWithoutRef<Props> & RefAttributes<Element>
>;
