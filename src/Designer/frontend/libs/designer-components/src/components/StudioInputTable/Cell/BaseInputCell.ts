import type { ForwardedRef, ForwardRefRenderFunction, KeyboardEvent, PropsWithoutRef } from 'react';
import { forwardRef } from 'react';
import type { InputCellComponent } from '../types/InputCellComponent';
import type { HTMLCellInputElement } from '../types/HTMLCellInputElement';
import { getNextInputElement } from '../dom-utils/getNextInputElement';
import type { Override } from '../../../types/Override';

type DefaultProps<Element extends HTMLCellInputElement> = {
  onKeyDown?: (event: KeyboardEvent<Element>) => void;
};

type RestrictedKeyboardEvent<Element, Keys extends KeyboardEvent<Element>['key']> = Override<
  { key: Keys },
  KeyboardEvent<Element>
>;

type ArrowKeyEvent<Element> = RestrictedKeyboardEvent<
  Element,
  'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
>;

type EnterKeyEvent<Element> = RestrictedKeyboardEvent<Element, 'Enter'>;

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
    if (isArrowKeyEvent<Element>(event)) {
      this.handleArrowKeyDown(event);
    } else if (isEnterKeyEvent<Element>(event)) {
      this.handleEnterKeyDown(event);
    }
  }

  private handleArrowKeyDown(event: ArrowKeyEvent<Element>): void {
    if (this.shouldMoveFocusOnArrowKey(event)) {
      this.moveFocus(event);
    }
  }

  private handleEnterKeyDown(event: EnterKeyEvent<Element>): void {
    if (this.shouldMoveFocusOnEnterKey(event)) {
      this.moveFocus(event);
    }
  }

  protected abstract shouldMoveFocusOnArrowKey(event: ArrowKeyEvent<Element>): boolean;

  protected abstract shouldMoveFocusOnEnterKey(event: EnterKeyEvent<Element>): boolean;

  private moveFocus(event: KeyboardEvent<Element>): void {
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

function isArrowKeyEvent<Element>(event: KeyboardEvent<Element>): event is ArrowKeyEvent<Element> {
  return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key);
}

function isEnterKeyEvent<Element>(event: KeyboardEvent<Element>): event is EnterKeyEvent<Element> {
  return event.key === 'Enter';
}
