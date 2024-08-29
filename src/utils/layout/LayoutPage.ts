import { splitDashedKey } from 'src/utils/splitDashedKey';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutObject } from 'src/utils/layout/LayoutObject';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';
import type { TraversalTask } from 'src/utils/layout/useNodeTraversal';

/**
 * The layout page is a class containing an entire page/form layout, with all components/nodes within it. It
 * allows for fast/indexed searching, i.e. looking up an exact node in constant time.
 */
export class LayoutPage implements LayoutObject {
  public parent: this;
  public layoutSet: LayoutPages;
  public pageKey: string;

  private allChildren: Map<string, LayoutNode> = new Map();

  /**
   * Adds a child to the collection. For internal use only.
   */
  public _addChild(child: LayoutNode) {
    this.allChildren.set(child.id, child);
  }

  public _removeChild(child: LayoutNode) {
    this.allChildren.delete(child.id);
  }

  /**
   * Looks for a matching component upwards in the hierarchy, returning the first one (or undefined if
   * none can be found). A BaseLayoutNode will look at its siblings and then further up in the hierarchy.
   * When it reaches a page object like this, we'll have to look to see if any nodes in the page matches,
   * and otherwise pass the task upwards to all pages.
   */
  public closest(task: TraversalTask, passedFrom?: LayoutPage | LayoutNode | LayoutPages): LayoutNode | undefined {
    const out = this.firstDeepChild(task); // First deep child that passes
    if (out) {
      return out;
    }

    if (this.layoutSet && this.layoutSet !== passedFrom) {
      return this.layoutSet.closest(task, this);
    }

    return undefined;
  }

  protected directChildren(_task: TraversalTask): LayoutNode[] {
    return [...this.allChildren.values()].filter((node) => node.parent === this);
  }

  public firstChild(task: TraversalTask): LayoutNode | undefined {
    for (const node of this.directChildren(task)) {
      if (task.passes(node)) {
        return node;
      }
    }

    return undefined;
  }

  private firstDeepChild(task: TraversalTask): LayoutNode | undefined {
    for (const node of this.allChildren.values()) {
      if (task.passes(node)) {
        return node;
      }
    }

    return undefined;
  }

  public children(task: TraversalTask): LayoutNode[] {
    if (task.allPasses()) {
      return this.directChildren(task);
    }

    const children: LayoutNode[] = [];
    for (const node of this.directChildren(task)) {
      if (task.passes(node)) {
        children.push(node);
      }
    }

    return children;
  }

  public flat(task: TraversalTask): LayoutNode[] {
    return [...this.allChildren.values()].filter((n) => task.passes(n));
  }

  public findById(task: TraversalTask, id: string | undefined, traversePages = true): LayoutNode | undefined {
    if (!id) {
      return undefined;
    }

    if (this.allChildren.has(id)) {
      return this.allChildren.get(id);
    }

    const baseId = splitDashedKey(id).baseComponentId;
    if (this.allChildren.has(baseId)) {
      return this.allChildren.get(baseId);
    }

    if (traversePages && this.layoutSet) {
      return this.layoutSet.findById(task, id, this.pageKey);
    }

    return undefined;
  }

  public isRegisteredInCollection(layoutSet: LayoutPages): boolean {
    return this.pageKey !== undefined && layoutSet.isPageRegistered(this.pageKey, this);
  }

  public registerCollection(pageKey: string, layoutSet: LayoutPages) {
    this.pageKey = pageKey;
    this.layoutSet = layoutSet;
    layoutSet.replacePage(this);
  }
}
