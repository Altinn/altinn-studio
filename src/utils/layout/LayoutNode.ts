import { getComponentDef } from 'src/layout';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import { typedBoolean } from 'src/utils/typing';
import type { CompClassMap, CompDef } from 'src/layout';
import type { CompCategory } from 'src/layout/common';
import type { ComponentTypeConfigs } from 'src/layout/components.generated';
import type { CompIntermediate, CompTypes, LayoutNodeFromCategory, ParentNode } from 'src/layout/layout';
import type { LayoutObject } from 'src/utils/layout/LayoutObject';
import type { TraversalTask } from 'src/utils/layout/useNodeTraversal';

export interface LayoutNodeProps<Type extends CompTypes> {
  item: CompIntermediate<Type>;
  parent: ParentNode;
  rowIndex?: number;
}

/**
 * A LayoutNode wraps a component with information about its parent, allowing you to traverse a component (or an
 * instance of a component inside a repeating group), finding other components near it.
 */
export class BaseLayoutNode<Type extends CompTypes = CompTypes> implements LayoutObject {
  public readonly parent: ParentNode;
  public readonly rowIndex?: number;
  public readonly page: LayoutPage;
  public readonly def: CompClassMap[Type];

  // These may be overwritten if the state in NodesContext changes. They are only kept
  // updated here for convenience.
  public id: string;
  public baseId: string;
  public multiPageIndex: number | undefined;
  public pageKey: string;
  public type: Type;

  public constructor({ item, parent, rowIndex }: LayoutNodeProps<Type>) {
    this.id = item.id;
    this.baseId = item.baseComponentId ?? item.id;
    this.type = item.type as Type;
    this.multiPageIndex = item.multiPageIndex;
    this.page = parent instanceof LayoutPage ? parent : parent.page;
    this.pageKey = this.page.pageKey;
    this.def = getComponentDef(this.type);
    this.parent = parent;
    this.rowIndex = rowIndex;
  }

  public isType<T extends CompTypes>(type: T): this is LayoutNode<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.type as any) === type;
  }

  public isCategory<T extends CompCategory>(category: T): this is LayoutNodeFromCategory<T> {
    return this.def.category === category;
  }

  public closest(task: TraversalTask, _passedFrom?: LayoutPage | LayoutNode): LayoutNode | undefined {
    if (task.passes(this)) {
      return this as LayoutNode;
    }

    const sibling = this.parent.firstChild(task.addRestriction(this.rowIndex));
    if (sibling) {
      return sibling as LayoutNode;
    }

    return this.parent.closest(task, this as LayoutNode);
  }

  private recurseParents(callback: (node: ParentNode) => void) {
    callback(this.parent);
    if (!(this.parent instanceof LayoutPage)) {
      this.parent.recurseParents(callback);
    }
  }

  public parents(task: TraversalTask): ParentNode[] {
    const parents: ParentNode[] = [];
    this.recurseParents((node) => parents.push(node));
    return parents.filter((parent) => task.passes(parent));
  }

  private childrenAsList(task: TraversalTask) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const def = this.def as CompDef<any>;
    return def.pickDirectChildren(task.getData(this), task.restriction).filter(typedBoolean) as LayoutNode[];
  }

  public firstChild(task: TraversalTask): LayoutNode | undefined {
    const list = this.childrenAsList(task);
    for (const node of list) {
      if (task.passes(node)) {
        return node;
      }
    }

    return undefined;
  }

  public children(task: TraversalTask): LayoutNode[] {
    const list = this.childrenAsList(task);
    if (task.allPasses()) {
      return list;
    }

    const out: LayoutNode[] = [];
    for (const node of list) {
      if (task.passes(node)) {
        out.push(node);
      }
    }

    return out;
  }

  public flat(task: TraversalTask): LayoutNode[] {
    const out: LayoutNode[] = [];
    const recurse = (n: LayoutNode) => {
      task.passes(n) && out.push(n);
      for (const child of n.children(task)) {
        recurse(child);
      }
    };

    recurse(this as unknown as LayoutNode);
    return out as LayoutNode[];
  }
}

export type LayoutNode<Type extends CompTypes = CompTypes> = Type extends CompTypes
  ? ComponentTypeConfigs[Type]['nodeObj']
  : BaseLayoutNode;
