import type { ForwardedRef, ForwardRefRenderFunction, KeyboardEvent, PropsWithoutRef } from 'react';
import { forwardRef } from 'react';
import type { InputCellComponent } from '../types/InputCellComponent';
import type { HTMLCellInputElement } from '../types/HTMLCellInputElement';
import { getNextInputElement } from '../dom-utils/getNextInputElement';

type DefaultProps<Element extends HTMLCellInputElement> = {
  onKeyDown?: (event: KeyboardEvent<Element>) => void;
};

export abstract class BaseInputCell<
  Element extends HTMLCellInputElement,
  Props extends DefaultProps<Element>,
> {
  displayName: string;

  constructor(displayName: string) {
    this.displayName = displayName;
  }

  component(): InputCellComponent<Props, Element> {
    const component = forwardRef<Element, Props>(this.renderWithDefaultProps);
    component.displayName = this.displayName;
    return component;
  }

  private renderWithDefaultProps: ForwardRefRenderFunction<Element, PropsWithoutRef<Props>> = (
    props,
    ref,
  ) => this.render({ ...props, ...this.defaultProps }, ref);

  protected abstract render(
    props: PropsWithoutRef<Props>,
    ref: ForwardedRef<Element>,
  ): ReturnType<ForwardRefRenderFunction<Element, Props>>;

  private defaultProps: Required<DefaultProps<Element>> = {
    onKeyDown: (event) => this.handleKeyDown(event),
  };

  private handleKeyDown(event: KeyboardEvent<Element>): void {
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        this.handleArrowKeyDown(event);
        break;
      case 'Enter':
        this.handleEnterKeyDown(event);
        break;
    }
  }

  private handleArrowKeyDown(event: KeyboardEvent<Element>): void {
    if (this.shouldMoveFocusOnArrowKey(event)) {
      this.moveFocus(event);
    }
  }

  private handleEnterKeyDown(event: KeyboardEvent<Element>): void {
    if (this.shouldMoveFocusOnEnterKey(event)) {
      this.moveFocus(event);
    }
  }

  protected abstract shouldMoveFocusOnArrowKey(event: KeyboardEvent<Element>): boolean;

  protected abstract shouldMoveFocusOnEnterKey(event: KeyboardEvent<Element>): boolean;

  private moveFocus(event: KeyboardEvent<Element>) {
    const nextElement = this.getNextElement(event);
    if (nextElement) {
      event.preventDefault();
      nextElement.focus();
    }
  }

  private getNextElement({
    key,
    currentTarget,
  }: KeyboardEvent<Element>): HTMLCellInputElement | null {
    return getNextInputElement(currentTarget, key);
  }
}
