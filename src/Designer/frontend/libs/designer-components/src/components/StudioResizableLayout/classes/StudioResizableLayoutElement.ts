import type { ReactElement } from 'react';
import type { StudioResizableLayoutElementProps } from '../StudioResizableLayoutElement/StudioResizableLayoutElement';

export class StudioResizableLayoutArea {
  constructor(
    public index: number,
    public HTMLElementRef: HTMLElement,
    public reactElement: ReactElement<StudioResizableLayoutElementProps>,
    public orientation: 'horizontal' | 'vertical',
  ) {}

  public get size(): number {
    return this.orientation === 'vertical'
      ? this.HTMLElementRef.offsetHeight!
      : this.HTMLElementRef.offsetWidth!;
  }

  public get flexGrow(): number {
    return parseFloat(this.HTMLElementRef.style.flexGrow || '1');
  }

  public get minimumSize(): number {
    return this.reactElement.props.minimumSize || 0;
  }

  public get maximumSize(): number {
    return this.reactElement.props.maximumSize || Number.MAX_SAFE_INTEGER;
  }

  public get collapsedSize(): number {
    return this.reactElement.props.collapsedSize || 0;
  }

  public get collapsed(): boolean {
    return this.reactElement.props.collapsed || false;
  }
}
