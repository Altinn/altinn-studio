import { runValidationOnNodes } from 'src/utils/validation/validation';
import type { CompExceptGroup, CompInternal } from 'src/layout/layout';
import type { IUiConfig } from 'src/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutObject } from 'src/utils/layout/LayoutObject';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';
import type { IValidationContext, IValidationObject } from 'src/utils/validation/types';

/**
 * The layout page is a class containing an entire page/form layout, with all components/nodes within it. It
 * allows for fast/indexed searching, i.e. looking up an exact node in constant time.
 */
export class LayoutPage implements LayoutObject {
  public item: Record<string, undefined> = {};
  public parent: this;
  public top: { myKey: string; collection: LayoutPages };

  private directChildren: LayoutNode[] = [];
  private allChildren: LayoutNode[] = [];
  private idMap: { [id: string]: number[] } = {};

  /**
   * Adds a child to the collection. For internal use only.
   */
  public _addChild(child: LayoutNode) {
    if (child.parent === this) {
      this.directChildren.push(child as LayoutNode);
    }
    const idx = this.allChildren.length;
    this.allChildren.push(child);

    this.idMap[child.item.id] = this.idMap[child.item.id] || [];
    this.idMap[child.item.id].push(idx);

    const baseComponentId: string | undefined = child.item.baseComponentId;
    if (baseComponentId) {
      this.idMap[baseComponentId] = this.idMap[baseComponentId] || [];
      this.idMap[baseComponentId].push(idx);
    }
  }

  /**
   * Looks for a matching component upwards in the hierarchy, returning the first one (or undefined if
   * none can be found). Implemented here for parity with LayoutNode
   */
  public closest(matching: (item: CompInternal) => boolean, traversePages = true): LayoutNode | undefined {
    const out = this.children(matching);
    if (out) {
      return out;
    }

    if (traversePages && this.top) {
      const otherLayouts = this.top.collection.flat(this.top.myKey);
      for (const page of otherLayouts) {
        const found = page.closest(matching, false);
        if (found) {
          return found;
        }
      }
    }

    return undefined;
  }

  /**
   * Returns a list of direct children, or finds the first node matching a given criteria. Implemented
   * here for parity with LayoutNode.
   */
  public children(): LayoutNode[];
  public children(matching: (item: CompInternal) => boolean): LayoutNode | undefined;
  public children(matching?: (item: CompInternal) => boolean): any {
    if (!matching) {
      return this.directChildren;
    }

    for (const item of this.directChildren) {
      if (matching(item.item)) {
        return item;
      }
    }

    return undefined;
  }

  /**
   * This returns all the child nodes (including duplicate components for repeating groups) as a flat list of
   * LayoutNode objects.
   *
   * @param includeGroups If true, also includes the group nodes
   */
  public flat(includeGroups: true): LayoutNode[];
  public flat(includeGroups: false): LayoutNode<CompExceptGroup>[];
  public flat(includeGroups: boolean): LayoutNode[] {
    if (!includeGroups) {
      return this.allChildren.filter((c) => c.item.type !== 'Group');
    }

    return this.allChildren;
  }

  public findById(id: string, traversePages = true): LayoutNode | undefined {
    if (this.idMap[id] && this.idMap[id].length) {
      return this.allChildren[this.idMap[id][0]];
    }

    if (traversePages && this.top) {
      return this.top.collection.findById(id, this.top.myKey);
    }

    return undefined;
  }

  public findAllById(id: string, traversePages = true): LayoutNode[] {
    const out: LayoutNode[] = [];
    if (this.idMap[id] && this.idMap[id].length) {
      for (const idx of this.idMap[id]) {
        out.push(this.allChildren[idx]);
      }
    }

    if (traversePages && this.top) {
      for (const item of this.top.collection.findAllById(id, this.top.myKey)) {
        out.push(item);
      }
    }

    return out;
  }

  public registerCollection(myKey: string, collection: LayoutPages<any>) {
    this.top = {
      myKey,
      collection,
    };
  }

  /**
   * Runs frontend validations for all nodes in the layout, and returns an array of IValidationObject.
   */
  public runValidations(validationContext: IValidationContext): IValidationObject[] {
    return runValidationOnNodes(this.allChildren, validationContext);
  }

  public isHiddenViaTracks(uiConfig: IUiConfig): boolean {
    const myKey = this.top.myKey;
    if (myKey === uiConfig.currentView) {
      // If this is the current view, then it's never hidden. This avoids settings fields as hidden when
      // code caused this to be the current view even if it's not in the common order.
      return false;
    }

    if (myKey === uiConfig.receiptLayoutName) {
      // If this is the custom receipt layout, then it's never hidden.
      return false;
    }

    if (myKey === uiConfig.pdfLayoutName) {
      // If this is the pdf layout, then it's never hidden.
      return false;
    }

    const { order } = uiConfig.tracks || {};
    if (!order) {
      // If no tracks are provided, then we can't determine if this is hidden or not
      return false;
    }

    return !order.includes(myKey);
  }
}
