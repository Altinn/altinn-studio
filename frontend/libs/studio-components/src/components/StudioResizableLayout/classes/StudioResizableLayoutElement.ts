export class StudioResizableLayoutArea {
  constructor(
    public index: number,
    public HTMLElementRef: HTMLElement,
    public reactElement: React.ReactElement,
    public orientation: 'horizontal' | 'vertical',
  ) {}

  public get size() {
    return this.orientation === 'vertical'
      ? this.HTMLElementRef.offsetHeight!
      : this.HTMLElementRef.offsetWidth!;
  }

  public get flexGrow() {
    return this.reactElement.props.flexGrow || 1;
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
