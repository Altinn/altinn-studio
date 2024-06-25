import { StudioResizableLayoutElement } from './StudioResizableLayoutElement';

export class ResizeHandler {
  private containerElement: StudioResizableLayoutElement;
  private neighbourElement: StudioResizableLayoutElement;

  constructor(
    private orientation: 'horizontal' | 'vertical',
    containerElement: HTMLElement,
    containerMinimumSize: number,
    neghbourElement: HTMLElement,
    neighbourMinimumSize: number,
  ) {
    if (containerElement === undefined || neghbourElement === undefined) {
      throw new Error('Element is undefined');
    }
    this.containerElement = new StudioResizableLayoutElement(
      containerElement,
      containerMinimumSize,
      this.orientation,
    );
    this.neighbourElement = new StudioResizableLayoutElement(
      neghbourElement,
      neighbourMinimumSize,
      this.orientation,
    ); // TODO: make this use the next element's minimum size somehow
  }

  public ensureMinimumSize() {
    if (!this.containerElement || !this.neighbourElement) {
      return;
    }

    // TODO: implement collapsed state for the container
    //       maybe on dragging a certain distance over the minimum size?
    //       could possibly be hard to implement with the current solution
    if (this.containerElement.size < this.containerElement.minimumSize) {
      this.containerElement.flexGrow = 0;
      this.neighbourElement.flexGrow = 1;
    }
  }

  public resizeTo = (newSize: number): { containerFlexGrow: number; neighbourFlexGrow: number } => {
    if (this.containerElement.minimumSize > newSize) {
      newSize = this.containerElement.minimumSize;
    }
    const totalSize = this.containerElement.size + this.neighbourElement.size;
    if (this.neighbourElement.minimumSize > totalSize - newSize) {
      newSize = totalSize - this.neighbourElement.minimumSize;
    }
    const neighbourElementNewSize = totalSize - newSize;

    const totalFlexGrow = this.containerElement.flexGrow + this.neighbourElement.flexGrow;
    const containerFlexGrow = totalFlexGrow * (newSize / totalSize);
    const neighbourFlexGrow = totalFlexGrow * (neighbourElementNewSize / totalSize);
    return { containerFlexGrow, neighbourFlexGrow };
  };

  public resizeDelta = (
    delta: number,
  ): { containerFlexGrow: number; neighbourFlexGrow: number } => {
    return this.resizeTo(this.containerElement.size + delta);
  };
}
