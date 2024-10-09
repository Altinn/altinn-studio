import type { ForwardedRef, ForwardRefRenderFunction, PropsWithoutRef } from 'react';
import { forwardRef } from 'react';
import type { InputCellComponent } from '../types/InputCellComponent';
import type { HTMLCellInputElement } from '../types/HTMLCellInputElement';

export abstract class BaseInputCell<Element extends HTMLCellInputElement, Props extends {}> {
  displayName: string;

  constructor(displayName: string) {
    this.displayName = displayName;
  }

  component(): InputCellComponent<Props, Element> {
    const component = forwardRef<Element, Props>(this.render);
    component.displayName = this.displayName;
    return component;
  }

  protected abstract render(
    props: PropsWithoutRef<Props>,
    ref: ForwardedRef<Element>,
  ): ReturnType<ForwardRefRenderFunction<Element, Props>>;
}
