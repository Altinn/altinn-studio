import { getBaseComponentId } from 'src/utils/splitDashedKey';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';

interface Collection {
  [layoutKey: string]: LayoutPage;
}

/**
 * A tool when you have more than one LayoutPage (i.e. a full layout set). It can help you look up components
 * by ID, and if you have colliding component IDs in multiple layouts it will prefer the one in the current layout.
 */
export class LayoutPages {
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

  public findLayout(key: keyof Collection | string | undefined): LayoutPage | undefined {
    if (!key) {
      return undefined;
    }
    return this.objects[key];
  }

  public replacePage(page: LayoutPage) {
    this.objects[page.pageKey as keyof Collection] = page;
  }

  public isPageRegistered(pageKey: string, page: LayoutPage): boolean {
    return this.objects[pageKey] === page;
  }
}
