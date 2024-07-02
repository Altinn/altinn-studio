export class StudioResizableLayoutArea {
  constructor(
    public index: number,
    public HTMLElementRef: HTMLElement,
    public reactElement: React.ReactElement,
    public orientation: 'horizontal' | 'vertical',
  ) {
    if (HTMLElementRef === undefined) {
      throw new Error('Element is undefined');
    }
    if (reactElement === undefined) {
      throw new Error('React element is undefined');
    }
  }

  public get size() {
    return this.orientation === 'vertical'
      ? this.HTMLElementRef.offsetHeight!
      : this.HTMLElementRef.offsetWidth!;
  }

  public get flexGrow() {
    return parseFloat(this.HTMLElementRef.style.flexGrow || '1');
  }

  public get minimumSize() {
    return this.reactElement.props.minimumSize || 0;
  }

  public get maximumSize() {
    return this.reactElement.props.maximumSize || Number.MAX_SAFE_INTEGER;
  }

  public get collapsedSize() {
    return this.reactElement.props.collapsedSize || 0;
  }

  public get collapsed() {
    return this.reactElement.props.collapsed;
  }
}
