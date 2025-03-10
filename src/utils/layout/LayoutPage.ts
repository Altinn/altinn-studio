import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';

/**
 * The layout page is a class containing an entire page/form layout, with all components/nodes within it. It
 * allows for fast/indexed searching, i.e. looking up an exact node in constant time.
 */
export class LayoutPage {
  public parent: this;
  public layoutSet: LayoutPages;
  public pageKey: string;

  private allChildren: LayoutNode[] = [];
  private allChildIds = new Set<string>();
  private directChildren: LayoutNode[] = [];

  /**
   * Adds a child to the collection. For internal use only.
   */
  public _addChild(child: LayoutNode) {
    if (!this.allChildIds.has(child.id)) {
      this.layoutSet.registerNode(child);
      this.allChildIds.add(child.id);
      this.allChildren.push(child);

      // Direct children of a layout page are always static.
      // Only children of components like repeating groups are dynamic
      if (child.parent === this) {
        this.directChildren.push(child);
      }
    }
  }

  public _removeChild(child: LayoutNode) {
    if (this.allChildIds.has(child.id)) {
      this.layoutSet.unregisterNode(child);
      this.allChildIds.delete(child.id);

      const aI = this.allChildren.indexOf(child);
      aI > -1 && this.allChildren.splice(aI, 1);
      const dI = this.directChildren.indexOf(child);
      dI > -1 && this.directChildren.splice(dI, 1);
    }
  }

  public isRegisteredInCollection(layoutSet: LayoutPages): boolean {
    return this.pageKey !== undefined && layoutSet.isPageRegistered(this.pageKey, this);
  }

  public registerCollection(pageKey: string, layoutSet: LayoutPages) {
    this.pageKey = pageKey;
    this.layoutSet = layoutSet;
    layoutSet.replacePage(this);

    for (const node of this.allChildren) {
      layoutSet.registerNode(node);
    }
  }
}
