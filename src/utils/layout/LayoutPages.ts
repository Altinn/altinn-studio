import { getBaseComponentId } from 'src/utils/splitDashedKey';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutObject } from 'src/utils/layout/LayoutObject';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { TraversalTask } from 'src/utils/layout/useNodeTraversal';

interface Collection {
  [layoutKey: string]: LayoutPage;
}

/**
 * A tool when you have more than one LayoutPage (i.e. a full layout set). It can help you look up components
 * by ID, and if you have colliding component IDs in multiple layouts it will prefer the one in the current layout.
 */
export class LayoutPages implements LayoutObject<LayoutPage> {
  private readonly objects: Collection = {};
  private readonly nodes: Map<string, LayoutNode> = new Map();

  public constructor() {
    for (const layoutKey of Object.keys(this.objects)) {
      const layout = this.objects[layoutKey];
      layout.registerCollection(layoutKey, this);
    }
  }

  public registerNode(node: LayoutNode) {
    this.nodes.set(node.id, node);
  }

  public unregisterNode(node: LayoutNode) {
    this.nodes.delete(node.id);
  }

  public findById(id: string | undefined): LayoutNode | undefined {
    if (!id) {
      return undefined;
    }

    const node = this.nodes.get(id);
    if (node) {
      return node;
    }

    const baseNode = this.nodes.get(getBaseComponentId(id));
    if (baseNode) {
      return baseNode;
    }

    return undefined;
  }

  public findLayout(_task: TraversalTask, key: keyof Collection | string | undefined): LayoutPage | undefined {
    if (!key) {
      return undefined;
    }
    return this.objects[key];
  }

  public all(_task: TraversalTask): Collection {
    return this.objects;
  }

  public allNodes(task?: TraversalTask): LayoutNode[] {
    return [...this.nodes.values()].filter((n) => !task || task.passes(n));
  }

  public closest(task: TraversalTask, passedFrom?: LayoutPage | LayoutNode | LayoutPages): LayoutNode | undefined {
    return [...this.nodes.values()].filter((n) => n.page !== passedFrom).find((n) => task.passes(n));
  }

  public firstChild(task: TraversalTask): LayoutPage | undefined {
    return this.children(task).find((p) => task.passes(p));
  }

  public children(task: TraversalTask): LayoutPage[] {
    return Object.values(this.objects).filter((p) => task.passes(p));
  }

  public flat(task: TraversalTask): LayoutNode[] {
    return this.allNodes().filter((n) => task.passes(n));
  }

  public replacePage(page: LayoutPage) {
    this.objects[page.pageKey as keyof Collection] = page;
  }

  public isPageRegistered(pageKey: string, page: LayoutPage): boolean {
    return this.objects[pageKey] === page;
  }
}
