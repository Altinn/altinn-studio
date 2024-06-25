export class StudioResizableLayoutElement {
  constructor(
    private element: HTMLElement,
    public minimumSize: number,
    public orientation: 'horizontal' | 'vertical',
  ) {
    if (element === undefined) {
      throw new Error('Element is undefined');
    }
  }

  public get size() {
    return this.orientation === 'vertical' ? this.element.offsetHeight! : this.element.offsetWidth!;
  }

  public get flexGrow() {
    return parseFloat(this.element.style.flexGrow || '1');
  }

  public set flexGrow(value: number) {
    this.element.style.setProperty('flex-grow', value.toString());
  }
}
